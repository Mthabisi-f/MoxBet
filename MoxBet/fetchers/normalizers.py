from datetime import datetime
from zoneinfo import ZoneInfo

# sports used by fetching functions in tasks.py
SPORTS = {
    "FOOTBALL": "APISPORTS_HOST_FOOTBALL",
    # "BASKETBALL": "APISPORTS_HOST_BASKETBALL",
    # "HOCKEY": "APISPORTS_HOST_HOCKEY",
    # "RUGBY": "APISPORTS_HOST_RUGBY",
    # "VOLLEYBALL": "APISPORTS_HOST_VOLLEYBALL",
    # "NFL": "APISPORTS_HOST_NFL",
    # "NBA": "APISPORTS_HOST_NBA",
    # "MMA": "APISPORTS_HOST_MMA",
    # "HANDBALL": "APISPORTS_HOST_HANDBALL",
    # "FORMULA-1": "APISPORTS_HOST_FORMULA1",
    # "AFL": "APISPORTS_HOST_AFL",
    # "BASEBALL": "APISPORTS_HOST_BASEBALL",
}


# intervals for for calling fetch functions
INTERVALS = {
    "fixtures_live":  15,
    "fixtures_upcoming": 360,
    "auto_settle_tickets": 20,
}


# short statuses for ninished fixtures
FINISHED_STATUSES = {"FT", "AET", "PEN", "CANC", "PST"}


# Standardize market types
MARKET_TYPE_MAP = {
    "Match Winner": ["Fulltime Result", "1X2", "Result 1X2"], # implemented
    "Goals Over/Under": ["Over/Under", "Match Goals", "Goals Over/Under", "Total Goals", "O/U"], # implemented
    "Goals Over/Under 2nd Half": ["Goals Over/Under - Second Half", "Goals Over/Under Second Half"],
    "Goals Over/Under 1st Half": ["Goals Over/Under - First Half", "Goals Over/Under First Half"],
    "Both Teams To Score": ["BTTS", "Both Teams Score", "Both Teams to Score"], # implemented
    "Odd/Even FT": ["Total Goals Even/Odd", "Odd/Even"], 
    "2nd half Away To Score": ["Away Score a Goal (2nd Half)"],
    "Last Team To Score": ["Last Team to Score (3 way)"],
    "1X2 & BTTS": ["Result / Both Teams To Score"],
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
    "Correct Score": ["Exact Score"],
    "Who Will Win": ["Home/Away"],
    "1X2 & Over/Under" : ["Result/Total Goals"],

    "BTTS & Over/Under": ["Total Goals/Both Teams To Score"],
    "Odd/Even 1st Half": ["Odd/Even - First Half"],
    "Odd/Even 1st Half": ["Odd/Even - Second Half"],
    "Exact Total Goals": ["Exact Goals Number"],
    "Halftime/Fulltime": ["HT/FT Double", "HT/FT"]
}


# Standardize prediction values
SPECIAL_MAP = {
    "1X": ["home or draw", "home/draw"],
    "12": ["home or away", "home/away"],
    "X2": ["away or draw", "draw or away", "draw/away", "away/draw"],
}


PREDICTION_MAP = {
    "2": ["2", "away team", "away", "team2", "visitor", "away win"],
    "1": ["1", "H", "home", "home win", "team1", "local"],
    "X": ["X", "draw", "tie"],

    "1X": ["home or draw"],
    "12": ["home or away"],
    "X2": ["away or draw", "draw or away"],

    "1/1": ["home/home"],
    "1/X": ["home/draw"],
    "1/2": ["home/away"],
    "X/1": ["draw/home"],
    "X/X": ["draw/draw"],
    "X/2": ["draw/away"],
    "2/1": ["away/home"],
    "2/X": ["away/draw"],
    "2/2": ["away/away"],

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

    "1 & O": ["home/over"],
    "1 & U": ["home/under"],
    "X & O": ["draw/over"],
    "X & U": ["draw/under"],
    "2 & O": ["away/over"],
    "2 & U": ["away/under"],

    "1 & Y": ["home/yes"],
    "1 & N": ["home/no"],
    "X & Y": ["draw/yes"],
    "X & N": ["draw/no"],
    "2 & Y": ["away/yes"],
    "2 & N": ["away/no"],

    "Y & O": ["o/yes"],
    "Y & U": ["u/yes"],
    "N & O": ["o/no"],
    "N & U": ["u/no"],
    "7+": ["more 7"]
}


def normalize_market(market_name: str) -> str:
    for canonical, aliases in MARKET_TYPE_MAP.items():
        if market_name.lower() == canonical.lower() or market_name.lower() in [a.lower() for a in aliases]:
            return canonical
    return market_name  # fallback if no match


def special_normalize_prediction(prediction: str) -> str:
    prediction_lower = prediction.lower()
    for canonical, aliases in SPECIAL_MAP.items():
        if prediction_lower == canonical.lower() or prediction_lower in [a.lower() for a in aliases]:
            return canonical
    return prediction  # fallback if no match


def normalize_prediction(prediction: str) -> str:
    prediction_lower = prediction.lower()
    for canonical, aliases in PREDICTION_MAP.items():
        if prediction_lower == canonical.lower() or prediction_lower in [a.lower() for a in aliases]:
            return canonical
    return prediction  # fallback if no match

