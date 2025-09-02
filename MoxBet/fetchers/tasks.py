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
from MoxBet.fetchers.sports import SPORTS
from MoxBet.models import Leagues, Results
from MoxBet.fetchers.intervals import INTERVALS
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from .normalizers import (normalize_market, normalize_prediction, special_normalize_prediction)



# def safe_cache_key(key: str) -> str:
#     """
#     Sanitize cache key for Memcached:
#     - Allow only letters, numbers, ':', '-', '_'
#     - Replace everything else with '_'
#     - Truncate if key is too long (>250 chars for memcached)
#     """
#     key = re.sub(r'[^a-zA-Z0-9:_-]', '_', key)
#     return key[:250]  # memcached max key length


# def cache_changed(cache, key: str, value=None, timeout=60 * 5):
#     """
#     Update cache safely with a sanitized key.
#     """
#     safe_key = safe_cache_key(key)
#     cache.set(safe_key, value, timeout)
#     return safe_key



def publish_change(channel, payload):
    try:
        redis_client.publish(channel, payload)
    except Exception:
        pass


# --- FETCHER IMPLEMENTATIONS ---
async def fetch_matches_and_odds_bulk(client, sport, host):
    start_date = date.today()
    end_date = start_date + timedelta(days=2)
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
            resp_f = await get(client, host, "fixtures", params={"date": today,"status": "NS"}) # removed  to fetch all games including finished
            fixtures_data = resp_f.get("response", [])
            if not fixtures_data:
                print(f"[INFO] No fixtures on {today}")
                current += timedelta(weeks=1)
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
    await update_league_match_counts(f"{sport}")


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
    await update_league_match_counts(f"{sport}")


FINISHED_STATUSES = {"FT", "AET", "PEN", "CANC", "PST"}


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
        expiry = 60 * 60 * 3
        if status in ["1H", "2H", "HT", "BT", "ET", "P", "LIVE"]:
            expiry = 60 * 60
        elif status in FINISHED_STATUSES:
            expiry = 60 * 60
            # Store result in DB (we still keep Results in DB!)
            await sync_to_async(Results.objects.update_or_create, thread_sensitive=True)(
                match_id=fixture_id,
                sport=sport,
                league_id=league_id,
                defaults={
                    "datetime": nf["fixture"]["date"],
                    "extras": {k: v for k, v in nf.items() if k not in ["league", "fixture", "id"]},
                }
            )


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
            "odds": fixture_odds
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

        # Store league info in Redis
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
        if status in ["1H", "2H", "HT", "ET", "P", "LIVE"]:
            await redis_client.sadd(f"live:{sport.lower()}", cache_key)

        print(f"[CACHED] {sport} fixture {fixture_id} ({status})")



# async def process_day(fixtures_data, all_odds, sport, live=False):
#     if not all_odds:
#         print("No all odds")
#         return

#     # Collect unique leagues
#     print("Collecting unique leagues")
#     unique_leagues = {(f["league"]["name"], f["league"]["country"], sport) for f in fixtures_data}
#     existing_leagues = {}


#     # Map odds by fixture_id
#     print('Looking for odds map')
#     odds_map = {entry["fixture"]["id"]: entry for entry in all_odds}

#     for nf in fixtures_data:
#         fixture_id = nf["fixture"]["id"]
#         league_key = (nf["league"]["name"], nf["league"]["country"], sport)
#         league_obj = existing_leagues.get(league_key)

#          # Preload or create leagues once
#         print('Preload leagues table')
#         for league_name, country, sp in unique_leagues:
#             league_obj, created = await sync_to_async(
#                 Leagues.objects.get_or_create, thread_sensitive=True
#             )(
#             league=league_name,
#             country=country,
#             sport=sp,
#             defaults={"league_json": nf["league"]}
#         )
#         existing_leagues[(league_name, country, sp)] = league_obj
#         if created:
#             print(f"[CREATED] New league: {league_name} ({country}) for sport {sp}")


#         if not league_obj:
#             continue

#         odds_entry = odds_map.get(fixture_id)
#         if not odds_entry:
#             continue

#         # Build odds dict
#         fixture_odds = {}

#         def build_market_object(bet):
#             market_type = normalize_market(bet["name"])
#             market_obj = {}
#             special_markets = {"Double Chance 1st Half", "Double Chance 2nd Half", "Double Chance"}
#             for v in bet.get("values", []):
#                 prediction = str(v["value"]).lower()
#                 handicap = v.get("handicap")
#                 prediction_key = f"{prediction} {handicap}" if handicap else prediction
#                 key = special_normalize_prediction(prediction_key) if market_type in special_markets else normalize_prediction(prediction_key)
#                 market_obj[key] = {
#                     "odd": float(v["odd"]) if v.get("odd") else None,
#                     "suspended": v.get("suspended", False)
#                 }
#             return market_type, market_obj

#         if not live:
#             for bookmaker in odds_entry.get("bookmakers", []):
#                 for bet in bookmaker.get("bets", []):
#                     market_type, market_obj = build_market_object(bet)
#                     fixture_odds.setdefault(market_type, {}).update(market_obj)
#         else:
#             for bet in odds_entry.get("odds", []):
#                 market_type, market_obj = build_market_object(bet)
#                 fixture_odds[market_type] = market_obj

#         payload = {
#             "match_id": fixture_id,
#             "sport": sport,
#             "country": nf["league"]["country"],
#             "league": nf["league"],
#             "league_id": nf["league"]["id"],
#             "venue": nf["fixture"]["venue"],
#             "datetime": nf["fixture"]["date"],
#             "status": nf["fixture"]["status"],
#             "extras": {k: v for k, v in nf.items() if k not in ["league", "fixture", "id"]},
#             "odds": fixture_odds
#         }

#         status = nf["fixture"]["status"]["short"]
#         expiry = 60 * 60 * 3
#         if status in ["1H", "2H", "HT", "BT", "ET", "P", "LIVE"]:
#             expiry = 60 * 60
#         elif status in FINISHED_STATUSES:
#             expiry = 60 * 60
#             # Store finished fixture in Results table
#             await sync_to_async(Results.objects.update_or_create, thread_sensitive=True)(
#                 match_id=fixture_id,
#                 sport=sport,
#                 league_id=league_obj,
#                 defaults={
#                     "datetime": nf["fixture"]["date"],
#                     "extras": {k: v for k, v in nf.items() if k not in ["league", "fixture", "id"]},
#                 }
#             )

#         # Redis caching
#         cache_key = f"match:{fixture_id}"
#         await redis_client.set(cache_key, json.dumps(payload), ex=expiry)

#         channel_layer = get_channel_layer()
#         await channel_layer.group_send(
#             f"live_odds_{sport.lower()}",
#             {"type": "odds.update", "data": payload}
#         )

#         await redis_client.sadd(f"sport:{sport.lower()}", cache_key)
#         await redis_client.sadd(f"league:{sport.lower()}:{nf['league']['id']}", cache_key)
#         await redis_client.sadd(f"country:{sport.lower()}:{nf['league']['country']}", cache_key)
#         match_date = nf["fixture"]["date"][:10]
#         await redis_client.sadd(f"time:{sport}:{match_date}", cache_key)
#         if status in ["1H", "2H", "HT", "ET", "P", "LIVE"]:
#             await redis_client.sadd(f"live:{sport.lower()}", cache_key)

#         print(f"[CACHED] {sport} fixture {fixture_id} ({status})")




async def update_league_match_counts(sport: str):
    # fetch all leagues stored in DB for this sport
    leagues = await sync_to_async(list)(Leagues.objects.filter(sport=sport))

    for league in leagues:
        id = league.league_json.get('id')
        redis_key = f"league:{sport.lower()}:{id}"
        count = await redis_client.scard(redis_key)  # count members of set
        if count is None:
            count = 0

        # update the league row
        await sync_to_async(Leagues.objects.filter(id=id).update, thread_sensitive=True)(
            total_matches=count
        )



# async def process_day(fixtures_data, all_odds, sport, live=False):
#     if not all_odds:
#         return

#     # Collect unique leagues
#     unique_leagues = {(f["league"], f["league"]["country"], sport) for f in fixtures_data}
#     existing_leagues = {}

#     for lg, country, sp in unique_leagues:
#         league_obj, created = await sync_to_async(Leagues.objects.get_or_create, thread_sensitive=True)(
#             league=lg, country=country, sport=sp
#         )
#         existing_leagues[(lg, country, sp)] = league_obj
#         if created:
#             print(f"[CREATED] New league: {lg["name"]} ({country}) for sport {sp}")

#     # Map odds by fixture_id
#     odds_map = {entry["fixture"]["id"]: entry for entry in all_odds}

#     for nf in fixtures_data:
#         fixture_id = nf["fixture"]["id"]
#         league_key = (nf["league"], nf["league"]["country"], sport)
#         league_obj = existing_leagues.get(league_key)

#         if not league_obj:
#             continue

#         odds_entry = odds_map.get(fixture_id)
#         if not odds_entry:
#             continue

#         # Combine all markets/odds for this fixture
#         fixture_odds = {}
#         # --- helper to build market object ---
        
#         def build_market_object(bet):
#             market_type = normalize_market(bet["name"])
#             market_obj = {}

#             # List (or set) of market types that require special handling
#             special_markets = {"Double Chance 1st Half", "Double Chance 2nd Half",
#                                 "Double Chance"}

#             for v in bet.get("values", []):
#                 prediction = str(v["value"]).lower()
#                 handicap = v.get("handicap")

#                 # Merge handicap into prediction if present
#                 if handicap is not None and str(handicap).strip() != "":
#                     prediction_key = f"{prediction} {handicap}"
#                 else:
#                     prediction_key = prediction

#                 # 🔹 Decide which normalizer to use
#                 if market_type in special_markets:
#                     key = special_normalize_prediction(prediction_key)
#                 else:
#                     key = normalize_prediction(prediction_key)

#                 market_obj[key] = {
#                     "odd": float(v["odd"]) if v.get("odd") else None,
#                     "suspended": v.get("suspended", False)
#                 }

#             return market_type, market_obj

#         # --- UPCOMING / PREMATCH ODDS ---
#         if not live:
#             for bookmaker in odds_entry.get("bookmakers", []):
#                 for bet in bookmaker.get("bets", []):
#                     market_type, market_obj = build_market_object(bet)

#                     # merge if market already exists (multiple bookmakers)
#                     if market_type not in fixture_odds:
#                         fixture_odds[market_type] = market_obj
#                     else:
#                         # optional: merge/overwrite if needed
#                         fixture_odds[market_type].update(market_obj)

#         # --- LIVE ODDS ---
#         else:
#             for bet in odds_entry.get("odds", []):
#                 market_type, market_obj = build_market_object(bet)

#                 # assign directly (live usually comes from 1 bookmaker)
#                 fixture_odds[market_type] = market_obj

#         payload = {
#             "match_id": fixture_id,
#             "sport": sport,
#             "country": nf["league"]["country"],
#             "league": nf["league"],
#             "league_id": nf["league"]["id"],
#             "venue": nf["fixture"]["venue"],
#             "datetime": nf["fixture"]["date"],
#             "status": nf["fixture"]["status"],   # includes {long, short, elapsed}
#             "extras": {k: v for k, v in nf.items() if k not in ["league", "fixture", "id"]},
#             "odds": fixture_odds
#         }

#         # Decide expiry based on match status
#         status = nf["fixture"]["status"]["short"]  # e.g. "NS", "1H", "HT", "FT"
#         expiry = 60 * 60 * 3  # default 24h

#         if status in ["1H", "2H", "HT", "ET", "P", "LIVE"]:   # in play
#             expiry = 60 * 30
#         elif status in ["FT", "AET", "PEN", "CANC", "PST"]:  # finished/cancelled/postponed
#             expiry = 60 * 60

#         cache_key = f"match:{fixture_id}"
#         await redis_client.set(cache_key, json.dumps(payload), ex=expiry)
        
#         channel_layer = get_channel_layer()

#         # Broadcast to a "live odds" group (per sport or global)
#         await channel_layer.group_send(
#             f"live_odds_{sport.lower()}",
#             {
#                 "type": "odds.update",
#                 "data": payload
#             }
#         )

#         # Add to indexes
#         await redis_client.sadd(f"sport:{sport.lower()}", cache_key)
#         await redis_client.sadd(f"league:{sport.lower()}:{nf["league"]["id"]}", cache_key)
#         await redis_client.sadd(f"country:{sport.lower()}:{nf['league']['country']}", cache_key)

#         # Index by date (YYYY-MM-DD)
#         match_date = nf["fixture"]["date"][:10]
#         await redis_client.sadd(f"time:{sport}:{match_date}", cache_key)

#         # If live → also add to live set
#         if status in ["1H", "2H", "HT", "ET", "P", "LIVE"]:
#             await redis_client.sadd(f"live:{sport.lower()}", cache_key)

#         print(f"[CACHED] {sport} fixture {fixture_id} ({status})")


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
            # odds
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_odds_for_sport(c,s,h), INTERVALS["odds"])))
            # standings
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_standings_for_sport(c,s,h), INTERVALS["standings"])))
            # lineups
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_lineups_for_sport(c,s,h), INTERVALS["lineups"])))
            # teams & players
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_teams_players_for_sport(c,s,h), INTERVALS["teams"])))
            # injuries
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_injuries_for_sport(c,s,h), INTERVALS["injuries"])))
            # competitions
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_competitions_for_sport(c,s,h), INTERVALS["competitions"])))
            # transfers
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_transfers_for_sport(c,s,h), INTERVALS["transfers"])))
            # predictions
            # jobs.append(asyncio.create_task(periodic(lambda c=client,s=sport,h=host: fetch_predictions_for_sport(c,s,h), INTERVALS["predictions"])))

        await asyncio.gather(*jobs)










