import os
import asyncio
import json
import re
from django.core.cache import cache
from datetime import date, timedelta
from django.core.cache import cache
from .client import api_client, get
import redis.asyncio as aioredis
from MoxBet.fetchers.sports import SPORTS
from MoxBet.models import Team, Leagues
from MoxBet.fetchers.intervals import INTERVALS
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer

from .normalizers import (
    norm_fixture,norm_upcoming_fixture, norm_odds_entry, norm_standings, norm_lineups,
    norm_team, norm_player, norm_injury, norm_competition,
    norm_transfer, normalize_market, normalize_prediction
)
from .repository import (
    upsert_fixture, upsert_odds, upsert_standings, upsert_lineup,
    upsert_team, upsert_player, upsert_injury, upsert_competition,
    upsert_transfer, upsert_prediction, cache_changed
)

redis_client = aioredis.Redis(host="127.0.0.1", port=6379, db=1,  decode_responses=True)  # index DB


def safe_cache_key(key: str) -> str:
    """
    Sanitize cache key for Memcached:
    - Allow only letters, numbers, ':', '-', '_'
    - Replace everything else with '_'
    - Truncate if key is too long (>250 chars for memcached)
    """
    key = re.sub(r'[^a-zA-Z0-9:_-]', '_', key)
    return key[:250]  # memcached max key length


def cache_changed(cache, key: str, value=None, timeout=60 * 5):
    """
    Update cache safely with a sanitized key.
    """
    safe_key = safe_cache_key(key)
    cache.set(safe_key, value, timeout)
    return safe_key



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
        print(f"[SKIP] No odds for {sport} today—no matches will be created.")
        return

    # Collect unique leagues
    unique_leagues = {(f["league"]["name"], f["league"]["country"], sport) for f in fixtures_data}
    existing_leagues = {}

    for name, country, sp in unique_leagues:
        league_obj, created = await sync_to_async(Leagues.objects.get_or_create, thread_sensitive=True)(
            league=name, country=country, sport=sp
        )
        existing_leagues[(name, country, sp)] = league_obj
        if created:
            print(f"[CREATED] New league: {name} ({country}) for sport {sp}")

    # Map odds by fixture_id
    odds_map = {entry["fixture"]["id"]: entry for entry in all_odds}

    for nf in fixtures_data:
        fixture_id = nf["fixture"]["id"]
        league_key = (nf["league"]["name"], nf["league"]["country"], sport)
        league_obj = existing_leagues.get(league_key)

        if not league_obj:
            print(f"[SKIP] Fixture {fixture_id}: league '{league_key}' not found—skipping.")
            continue

        odds_entry = odds_map.get(fixture_id)
        if not odds_entry:
            print(f"[SKIP] Fixture {fixture_id}: no odds—skipping.")
            continue

        # Combine all markets/odds for this fixture
        fixture_odds = {}
        # --- helper to build market object ---
        # def build_market_object(bet):
        #     market_type = normalize_market(bet["name"])
        #     market_obj = {}

        #     for v in bet.get("values", []):
        #         key = normalize_prediction(str(v["value"]).lower())  # home, away, draw etc.
        #         market_obj[key] = {
        #             "odd": float(v["odd"]) if v.get("odd") else None,
        #             "suspended": v.get("suspended", False)
        #         }
        #         if v.get("handicap") is not None:  # add handicap only if present
        #             market_obj[key]["handicap"] = v["handicap"]

        #     return market_type, market_obj
        def build_market_object(bet):
            market_type = normalize_market(bet["name"])
            market_obj = {}

            for v in bet.get("values", []):
                prediction = str(v["value"]).lower()
                handicap = v.get("handicap")

                # Merge handicap into prediction if present
                if handicap is not None and str(handicap).strip() != "":
                    prediction_key = f"{prediction} {handicap}"
                else:
                    prediction_key = prediction

                key = normalize_prediction(prediction_key)

                market_obj[key] = {
                    "odd": float(v["odd"]) if v.get("odd") else None,
                    "suspended": v.get("suspended", False)
                }

            return market_type, market_obj

        # --- UPCOMING / PREMATCH ODDS ---
        if not live:
            for bookmaker in odds_entry.get("bookmakers", []):
                for bet in bookmaker.get("bets", []):
                    market_type, market_obj = build_market_object(bet)

                    # merge if market already exists (multiple bookmakers)
                    if market_type not in fixture_odds:
                        fixture_odds[market_type] = market_obj
                    else:
                        # optional: merge/overwrite if needed
                        fixture_odds[market_type].update(market_obj)

        # --- LIVE ODDS ---
        else:
            for bet in odds_entry.get("odds", []):
                market_type, market_obj = build_market_object(bet)

                # assign directly (live usually comes from 1 bookmaker)
                fixture_odds[market_type] = market_obj

        payload = {
            "match_id": fixture_id,
            "sport": sport,
            "country": nf["league"]["country"],
            "league": nf["league"],
            "league_id": nf["league"]["id"],
            "venue": nf["fixture"]["venue"],
            "datetime": nf["fixture"]["date"],
            "status": nf["fixture"]["status"],   # includes {long, short, elapsed}
            "extras": {k: v for k, v in nf.items() if k not in ["league", "fixture", "id"]},
            "odds": fixture_odds
        }

        # Decide expiry based on match status
        status = nf["fixture"]["status"]["short"]  # e.g. "NS", "1H", "HT", "FT"
        expiry = 60 * 20  # default 24h

        if status in ["1H", "2H", "HT", "ET", "P", "LIVE"]:   # in play
            expiry = 60 * 1
        elif status in ["FT", "AET", "PEN", "CANC", "PST"]:  # finished/cancelled/postponed
            expiry = 60 * 1

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

        # Add to indexes
        await redis_client.sadd(f"sport:{sport.lower()}", cache_key)
        await redis_client.sadd(f"league:{sport.lower()}:{league_obj.id}", cache_key)
        await redis_client.sadd(f"country:{sport.lower()}:{nf['league']['country']}", cache_key)

        # Index by date (YYYY-MM-DD)
        match_date = nf["fixture"]["date"][:10]
        await redis_client.sadd(f"time:{sport}:{match_date}", cache_key)

        # If live → also add to live set
        if status in ["1H", "2H", "HT", "ET", "P", "LIVE"]:
            await redis_client.sadd(f"live:{sport.lower()}", cache_key)

        print(f"[CACHED] {sport} fixture {fixture_id} ({status})")



async def fetch_standings_for_sport(client, sport, host):
    path = "standings"
    data = await get(client, host, path, {})
    for item in data.get("response", []):
        league = item.get("league") or {}
        league_obj = upsert_competition = None
        # ensure league model exists
        league_obj = None
        try:
            from MoxBet.fetchers.repository import ensure_league
            league_obj = ensure_league(league.get("country"), league.get("name"), league.get("sport"))
        except Exception:
            league_obj = None
        payload = item
        if league_obj:
            upsert_standings(league_obj, league.get("season"), sport, payload)
            cache_changed(cache, f"standings:{sport}:{league.get('id')}:{league.get('season')}", payload)


async def fetch_lineups_for_sport(client, sport, host):
    path = "lineups"
    data = await get(client, host, path, {})
    for item in data.get("response", []):
        fx = item.get("fixture") or {}
        match_id = fx.get("id")
        nf = norm_lineups(sport, match_id, item)
        # ensure match exists or create stub
        match = upsert_fixture({
            "match_id": match_id,
            "sport_name": sport,
            "country": None, "league": None, "venue": None,
            "commence_datetime": None, "status": None,
            "extras": {"lineup_stub": True}
        })
        upsert_lineup(match, sport, nf["lineup"])
        cache_changed(cache, f"lineup:{sport}:{match_id}", nf["lineup"])

async def fetch_teams_players_for_sport(client, sport, host):
    # teams
    tpath = "teams"
    data = await get(client, host, tpath, {})
    for item in data.get("response", []):
        tp = norm_team(item, sport)
        upsert_team(tp)
    # players (this endpoint often needs team id; generic call may not return many players)
    ppath = "players"
    try:
        pdata = await get(client, host, ppath, {})
        for item in pdata.get("response", []):
            pp = norm_player(item, sport)
            # team linking best-effort: find team by id in DB
            team_obj = None
            try:
                team_obj = Team.objects.filter(team_id=(item.get("team") or {}).get("id")).first()
            except Exception:
                team_obj = None
            upsert_player(pp, team_obj)
    except Exception:
        pass

async def fetch_injuries_for_sport(client, sport, host):
    path = "injuries"
    data = await get(client, host, path, {})
    for item in data.get("response", []):
        payload = norm_injury(item, sport)
        # try linking player/team if present
        player_id = (item.get("player") or {}).get("id")
        team_id = (item.get("team") or {}).get("id")
        player_obj = None
        team_obj = None
        try:
            from MoxBet.models import Player, Team as TeamModel
            if player_id:
                player_obj = Player.objects.filter(player_id=player_id).first()
            if team_id:
                team_obj = TeamModel.objects.filter(team_id=team_id).first()
        except Exception:
            pass
        upsert_injury(player_obj, team_obj, sport, item)
        cache_changed(cache, f"injury:{sport}:{player_id}", item)

async def fetch_competitions_for_sport(client, sport, host):
    path = "leagues"
    data = await get(client, host, path, {})
    for item in data.get("response", []):
        cp = norm_competition(item, sport)
        upsert_competition(cp)
        cache_changed(cache, f"competition:{sport}:{cp['competition_id']}", item)

async def fetch_transfers_for_sport(client, sport, host):
    path = "transfers"
    try:
        data = await get(client, host, path, {})
        for item in data.get("response", []):
            upsert_transfer(item)
    except Exception:
        pass

async def fetch_predictions_for_sport(client, sport, host):
    path = "predictions"
    try:
        data = await get(client, host, path, {})
        for item in data.get("response", []):
            fx = item.get("fixture") or {}
            match_id = fx.get("id")
            # ensure match exists
            match = upsert_fixture({
                "match_id": match_id,
                "sport_name": sport,
                "country": None, "league": None, "venue": None,
                "commence_datetime": None, "status": None,
                "extras": {"prediction_stub": True}
            })
            upsert_prediction(match, sport, item)
    except Exception:
        pass

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










