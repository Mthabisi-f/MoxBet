from datetime import datetime
from zoneinfo import ZoneInfo

def to_dt(s):
    if not s: return None
    try:
        return datetime.fromisoformat(s.replace("Z","")).replace(tzinfo=ZoneInfo("UTC"))
    except Exception:
        return None

def norm_fixture(sport, raw):
    fx = raw.get("fixture") or raw 
    league = raw.get("league") or {}
    teams = raw.get("teams") or {}
    score = raw.get("score") or {}
    return {
        "match_id": fx.get("id"),
        "sport": sport,
        "country": league.get("country"),
        "league": league,
        "league_id": league.get("id"),
        "venue": (fx.get("venue") or {}).get("name"),
        "commence_datetime": to_dt(fx.get("date")),
        "status": (fx.get("status") or {}).get("short"),
        "extras": {
            "season": league.get("season"),
            "round": league.get("round"),
            "teams": teams,
            "score": score,
        }
    }


def norm_upcoming_fixture(sport, raw):
    fx = raw.get("fixture", {})
    league = raw.get("league", {})
    teams = raw.get("teams", {})

    return {
        "match_id": fx.get("id"),
        "sport": sport,
        "country": league.get("country"),
        "league": league.get("name"),
        "league_id": league.get("id"),
        "venue": (fx.get("venue") or {}).get("name"),
        "commence_datetime": to_dt(fx.get("date")),
        "status": (fx.get("status") or {}).get("short"),
        "extras": {
            "season": league.get("season"),
            "round": league.get("round"),
            "teams": teams,
            # "score": score,
        }
    }


    # return {
    #     "sport": sport,
    #     "match_id": fixture.get("id"),
    #     "league_id": league.get("id"),
    #     "league": league.get("name"),
    #     "country": league.get("country"),
    #     "season": league.get("season"),
    #     "date": fixture.get("date"),
    #     "status": fixture.get("status", {}).get("short"),
    #     "home_team_id": teams.get("home", {}).get("id"),
    #     "home_team_name": teams.get("home", {}).get("name"),
    #     "away_team_id": teams.get("away", {}).get("id"),
    #     "away_team_name": teams.get("away", {}).get("name"),
    # }


def norm_odds_entry(fixture_id, sport, market_type, odds, extra_data):
    """Normalize an odds market into a consistent dict
    sport : sport (e.g. 'FOOTBALL')
    match_id : fixture ID from API
    raw_market : the raw market dict from API
    """
    
    return {
            "sport": sport,
            "fixture_id": fixture_id,
            "market_type": market_type,
            "odds": odds ,
            "extras": extra_data
        }
    

def norm_standings(sport, league_obj, raw):
    return {
        "sport": sport,
        "league_id": league_obj,
        "season": raw.get("season"),
        "standings": raw.get("response"),
    }

def norm_lineups(sport, match_id, raw):
    return {
        "match_id": match_id,
        "sport": sport,
        "lineup": raw.get("response"),
    }

def norm_team(raw, sport):
    t = raw.get("team") or raw
    return {
        "team_id": t.get("id"),
        "name": t.get("name"),
        "logo": t.get("logo"),
        "country": raw.get("country") or None,
        "extras": raw,
        "sport": sport
    }

def norm_player(raw, sport):
    p = raw.get("player") or raw
    return {
        "player_id": p.get("id"),
        "name": p.get("name"),
        "photo": p.get("photo"),
        "nationality": p.get("nationality"),
        "birth": None,
        "position": p.get("position"),
        "sport": sport,
        "extras": raw
    }

def norm_injury(raw, sport):
    return {
        "sport": sport,
        "details": raw
    }

def norm_competition(raw, sport):
    c = raw.get("league") or raw
    return {
        "competition_id": c.get("id"),
        "name": c.get("name"),
        "country": c.get("country"),
        "season": c.get("season"),
        "sport": sport,
        "extras": raw
    }

def norm_transfer(raw, sport):
    return {
        "sport": sport,
        "details": raw
    }

def norm_prediction(raw, match_id, sport):
    return {
        "match_id": match_id,
        "sport": sport,
        "payload": raw
    }





