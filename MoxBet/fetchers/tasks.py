import os
import asyncio
import json
import re
from django.core.cache import cache
from datetime import date, timedelta
from django.core.cache import cache
from .client import api_client, get
from MoxBet.redis_client import redis_client
import redis.asyncio as aioredis
from asgiref.sync import sync_to_async
from MoxBet.services.settlemet.sports import SportsSettlementHandler
from channels.layers import get_channel_layer
from .normalizers import (normalize_market, normalize_prediction, special_normalize_prediction)
from .normalizers import SPORTS, INTERVALS, FINISHED_STATUSES


async def fetch_matches_and_odds_bulk(client, sport, host):
    start_date = date.today()
    end_date = start_date + timedelta(weeks=1)
    current = start_date

    while current <= end_date:
        today = current.isoformat()
        cache_key = f"fixtures_odds_{sport}_{today}"

        cached = await cache.aget(cache_key)
        if cached:
            fixtures_data, all_odds = cached
            print(f"[CACHE] Loaded data for {sport} on {today}")
        else:
            print(f"[TASK] Fetching data for {sport} on {today}")
            resp_f = await get(client, host, "fixtures", params={"date": today, "status": "NS"})
            fixtures_data = resp_f.get("response", [])
            if not fixtures_data:
                print(f"[INFO] No fixtures on {today}")
                current += timedelta(days=1)
                continue

            all_odds = []
            page = 1
            while True:
                print(f"[TASK] Fetching odds page {page} for {sport} on {today}")
                resp_o = await get(client, host, "odds", params={"date": today, "bookmaker": 8, "page": page})
                odds_page = resp_o.get("response", [])
                if not odds_page:
                    break
                all_odds.extend(odds_page)
                page += 1

            await cache.aset(cache_key, (fixtures_data, all_odds), timeout=60 * 60 * 6)

        print(f"[INFO] Got {len(fixtures_data)} fixtures & {len(all_odds)} odds for {today}")
        await process_day(fixtures_data, all_odds, sport)
        current += timedelta(days=1)

    print(f"[FINISHED] Processed from {start_date} to {end_date}")



async def fetch_live_matches_and_odds(client, sport, host):
    """
    Fetch live fixtures and their odds separately for all in-play matches,
    then process and update Redis.
    """
    print(f"[TASK] Fetching LIVE fixtures for {sport}")

    # Fetch live fixtures
    resp_f = await get(client, host, "fixtures", params={"live": "all"})
    fixtures_data = resp_f.get("response", [])

    if not fixtures_data:
        print(f"[INFO] No LIVE fixtures found for {sport}")
        return

    # Fetch live odds
    resp_o = await get(client, host, "odds/live")
    all_odds = resp_o.get("response", [])

    if not all_odds:
        print(f"[INFO] No LIVE odds found for {sport}")
        return

    # Process live fixtures and odds
    await process_day(fixtures_data, all_odds, sport, live=True)

    print(f"[INFO] Updated {len(fixtures_data)} LIVE fixtures & {len(all_odds)} odds for {sport}")



async def process_day(fixtures_data, all_odds, sport, live=False):
    if not all_odds:
        return

    odds_map = {entry["fixture"]["id"]: entry for entry in all_odds}

    for nf in fixtures_data:
        fixture_id = nf["fixture"]["id"]
        league_id = nf["league"]["id"]
        league_name = nf["league"]["name"]
        country = nf["league"]["country"]

        # Expiry rules
        status = nf["fixture"]["status"]["short"]
        expiry = 60 * 3

        odds_entry = odds_map.get(fixture_id)
        if not odds_entry:
            continue

        # Build odds dict
        fixture_odds = {}

        def build_market_object(bet):
            market_type = normalize_market(bet["name"])
            market_obj = {}
            special_markets = {"Double Chance 1st Half", "Double Chance 2nd Half", "Double Chance"}
            for v in bet.get("values", []):
                prediction = str(v["value"]).lower()
                handicap = v.get("handicap")
                prediction_key = f"{prediction} {handicap}" if handicap else prediction
                key = (
                    special_normalize_prediction(prediction_key)
                    if market_type in special_markets
                    else normalize_prediction(prediction_key)
                )
                market_obj[key] = {
                    "odd": float(v["odd"]) if v.get("odd") else None,
                    "suspended": v.get("suspended", False)
                }
            return market_type, market_obj

        if not live:
            for bookmaker in odds_entry.get("bookmakers", []):
                for bet in bookmaker.get("bets", []):
                    market_type, market_obj = build_market_object(bet)
                    fixture_odds.setdefault(market_type, {}).update(market_obj)
        else:
            for bet in odds_entry.get("odds", []):
                market_type, market_obj = build_market_object(bet)
                fixture_odds[market_type] = market_obj

        payload = {
            "match_id": fixture_id,
            "sport": sport,
            "country": country,
            "league": nf["league"],
            "league_id": league_id,
            "venue": nf["fixture"]["venue"],
            "datetime": nf["fixture"]["date"],
            "status": nf["fixture"]["status"],
            "extras": {k: v for k, v in nf.items() if k not in ["league", "fixture", "id"]},
            "odds": {} if status in FINISHED_STATUSES else fixture_odds
        }

       
        # --- Redis caching ---
        cache_key = f"match:{fixture_id}"
        await redis_client.set(cache_key, json.dumps(payload), ex=expiry)
        channel_layer = get_channel_layer()

        # Broadcast to a "live odds" group (per sport or global)
        await channel_layer.group_send(
            f"live_odds_{sport.lower()}",
            {
                "type": "odds.update",
                "data": payload
            }
        )

        # league that will be used in frontend
        league_info = {
            "id": league_id,
            "name": league_name,
            "country": country,
            "flag": nf["league"].get("flag"),
        }
        await redis_client.set(f"league:{sport.lower()}:{league_id}:info", json.dumps(league_info))

        # Register league under its country
        await redis_client.sadd(f"country:{sport.lower()}:{country}:leagues", league_id)

        # Register unique country for this sport
        await redis_client.sadd(f"countries:{sport.lower()}", country)

        # Keep your same match groupings
        await redis_client.sadd(f"sport:{sport.lower()}", cache_key)
        await redis_client.sadd(f"league:{sport.lower()}:{league_id}", cache_key)
        await redis_client.sadd(f"country:{sport.lower()}:{country}", cache_key)
        match_date = nf["fixture"]["date"][:10]
        await redis_client.sadd(f"time:{sport}:{match_date}", cache_key)
        if status in ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"]:
            await redis_client.sadd(f"live:{sport.lower()}", cache_key)
        
        if status in FINISHED_STATUSES:
            await redis_client.sadd(f"finished:{sport.lower()}", cache_key)

        print(f"[CACHED] {sport} fixture {fixture_id} ({status})")



# @shared_task
async def auto_settle_tickets():
    from MoxBet.models import Tickets
    tickets = Tickets.objects.filter(status__in=["Pending", "Refund"])
    for ticket in tickets:
        handler = SportsSettlementHandler(ticket)
        handler.settle()


# @shared_task
async def get_finished_fixtures():
    finished_keys = await redis_client.keys("finished:*")  # Get all finished match keys

    async def fetch_match(k):
        value = await redis_client.get(k)
        if value:
            return json.loads(value)
        return None

    matches = await asyncio.gather(*(fetch_match(k) for k in finished_keys))
    return [m for m in matches if m]


# generic periodic wrapper
async def periodic(task_coro, every_seconds):
    while True:
        try:
            await task_coro()
        except Exception:
            pass
        await asyncio.sleep(every_seconds)


# orchestrator
async def run_all():
    jobs =   []
    async with api_client() as client:
        for sport, envkey in SPORTS.items():
            host = os.environ.get(envkey, os.environ.get("APISPORTS_HOST_FOOTBALL"))
            
            # fixtures live
            jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_live_matches_and_odds(c,s,h), INTERVALS["fixtures_live"])))
            
            # fixtures upcoming (new)
            jobs.append(asyncio.create_task(periodic(lambda c=client   , s=sport, h=host: fetch_matches_and_odds_bulk(c, s, h), INTERVALS["fixtures_upcoming"])))
            
            # auto settletickets
            jobs.append(asyncio.create_task(periodic(auto_settle_tickets, INTERVALS["auto_settle_tickets"])))
 
           
        await asyncio.gather(*jobs)










