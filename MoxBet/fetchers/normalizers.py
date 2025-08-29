from datetime import datetime
from zoneinfo import ZoneInfo

# mappings.py

# Standardize market types



MARKET_TYPE_MAP = {
    "Match Winner": ["Fulltime Result", "1X2", "Result 1X2"], # implemented
    "Goals Over/Under": ["Over/Under", "Match Goals", "Goals Over/Under", "Total Goals", "O/U"], # implemented
    "Goals Over/Under 2nd Half": ["Goals Over/Under - Second Half", "Goals Over/Under Second Half"],
    "Goals Over/Under 1st Half": ["Goals Over/Under - First Half", "Goals Over/Under First Half"],
    "Both Teams To Score": ["BTTS", "Both Teams Score", "Both Teams to Score"], # implemented
    "Goals Odd/Even": ["Total Goals Even/Odd", "Odd/Even"], 
    "2nd half Away To Score": ["Away Score a Goal (2nd Half)"],
    "Last Team To Score": ["Last Team to Score (3 way)"],
    "1X2/BTTS": ["Result / Both Teams To Score"],
    "Away Team Over/Under": ["Away Team Goals", "Total - Away"],
    "Home Team Over/Under": ["Home Team Goals", "Total - Home"],
    "Away Team Exact Goals": ["How many goals will Away Team score?", "Away Team Exact Goals Number"],
    "Home Team Exact Goals": ["How many goals will Home Team score?", "Home Team Exact Goals Number"],
    "BTTS 2nd half": ["Both Teams To Score (2nd Half)"],
    "BTTS 1st half": ["Both Teams To Score (1st Half)"],
    "Last Team To Score": ["Last Team to Score (3 way)"],
    "Away Team Score In 2nd Half": ["Away Team Score a Goal (2nd Half)"],
    "Home Team Score In 2nd Half": ["Home Team Score a Goal (2nd Half)"],
    "Double Chance 1st Half": ["Double Chance - First Half"],
    "Correct Score 1st Half": ["Correct Score - First Half"],
    "Correct Score": ["Exact Score"]
}

# Standardize prediction values
PREDICTION_MAP = {
    "2": ["2", "away team", "away", "team2", "visitor", "away win"],
    "1": ["1", "H", "home", "home win", "team1", "local"],
    "X": ["X", "draw", "tie"],
    "1X": ["home or draw", "home/draw"],
    "12": ["home or away", "home/away"],
    "X2": ["away or draw", "away/draw", "draw or away", "draw/away"],
    "over 0.5": ["over_0.5"],
    "over 1.5": ["over_1.5"],
    "over 2.5": ["over_2.5"],
    "over 3.5": ["over_3.5"],
    "over 4.5": ["over_4.5"],
    "over 5.5": ["over_5.5"],
    "under 0.5": ["under_0.5"],
    "under 1.5": ["under_1.5"],
    "under 2.5": ["under_2.5"],
    "under 3.5": ["under_3.5"],
    "under 4.5": ["under_4.5"],
    "under 5.5": ["under_5.5"],
}


def normalize_market(market_name: str) -> str:
    for canonical, aliases in MARKET_TYPE_MAP.items():
        if market_name.lower() == canonical.lower() or market_name.lower() in [a.lower() for a in aliases]:
            return canonical
    return market_name  # fallback if no match


def normalize_prediction(prediction: str) -> str:
    prediction_lower = prediction.lower()
    for canonical, aliases in PREDICTION_MAP.items():
        if prediction_lower == canonical.lower() or prediction_lower in [a.lower() for a in aliases]:
            return canonical
    return prediction  # fallback if no match


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





