SPORTS = {
    "FOOTBALL": "APISPORTS_HOST_FOOTBALL",
    "BASKETBALL": "APISPORTS_HOST_BASKETBALL",
    "HOCKEY": "APISPORTS_HOST_HOCKEY",
    "RUGBY": "APISPORTS_HOST_RUGBY",
    "VOLLEYBALL": "APISPORTS_HOST_VOLLEYBALL",
    "NFL": "APISPORTS_HOST_NFL",
    "NBA": "APISPORTS_HOST_NBA",
    "MMA": "APISPORTS_HOST_MMA",
    "HANDBALL": "APISPORTS_HOST_HANDBALL",
    "FORMULA-1": "APISPORTS_HOST_FORMULA1",
    "AFL": "APISPORTS_HOST_AFL",
    "BASEBALL": "APISPORTS_HOST_BASEBALL",
}



# import httpx
# import logging
# from django.conf import settings
# from models import Matches, Team, Leagues, MatchOdds

# API_BASE_URL = "https://api-football.com/v3"
# API_KEY = settings.API_FOOTBALL_KEY
# HEADERS = {"X-API-Key": API_KEY}

# # Setup logging
# logger = logging.getLogger(__name__)

# def fetch_prematch_games():
#     """Fetch prematch soccer games and store/update them in DB"""
#     url = f"{API_BASE_URL}/fixtures?status=NS"  # NS = Not Started
#     with httpx.Client() as client:
#         response = client.get(url, headers=HEADERS)
#         if response.status_code != 200:
#             print("Error fetching prematch games:", response.status_code)
#             return

#         data = response.json()
#         sport = 'football'

#         # Step 1: Extract unique leagues
#         unique_leagues = set(
#             (game["league"], sport)
#             for game in data
#         )

#         # Step 2: Fetch existing leagues
#         existing_leagues = {
#             (league["league"], sport): league
#             for league in Leagues.objects.filter(
#                 league__in=[l[0] for l in unique_leagues],  
#                 sport__in=[l[2] for l in unique_leagues]
#             )
#         }

#             # Step 3: Insert missing leagues
#         new_leagues = [
#             Leagues(league=league, sport=sport)
#             for league, sport in unique_leagues
#             if (league, sport) not in existing_leagues
#         ]
#         Leagues.objects.bulk_create(new_leagues, ignore_conflicts=True)

#         # Refresh leagues
#         existing_leagues.update({
#             (league.league, league.country, league.sport): league
#             for league in Leagues.objects.all()
#         })

#         # Step 4: Process matches
#         new_matches = []
#         updated_matches = []

#         for match_data in data.get("response", []):
#             try:
#                 league_obj = existing_leagues.get((match_data["league"], sport))
#                 if not league_obj:
#                     print(f"Skipping fixture {match_data['fixture']["id"]} - League not found")
#                     continue

#                 # Prepare extras (handle different sports)
#                 extras_data = {key: match_data[key] for key in match_data if key not in ["id", "date", "league", "venue", "status", "odds"]}

#                 fixture = match_data["fixture"]
#                 league = fixture["league"]

#                 # home_team, _ = Team.objects.get_or_create(name=teams["home"]["name"])
#                 # away_team, _ = Team.objects.get_or_create(name=teams["away"]["name"])

#                 match, created = Matches.objects.update_or_create(
#                     match_id=fixture["id"],
#                     defaults={
#                         "sport": sport,
#                         "country": league["country"],
#                         "league": league["name"],
#                         "league_id": league["id"],
#                         "venue": fixture["venue"],
#                         "commence_datetime": fixture["date"],
#                         "status": fixture["status"],
#                         "extras": extras_data,
#                     },
#                 )

#                 # Step 5: Process odds
#                 odds_data = fixture.get("odds", [])
#                 if isinstance(odds_data, dict):  # ✅ Convert dictionary to list
#                     odds_data = [{"market_type": k, "odds": v} for k, v in odds_data.items()]


#                 for odds_entry in odds_data:
#                     if isinstance(odds_entry, dict) and "market_type" in odds_entry and "odds" in odds_entry:
#                         market_type = odds_entry["market_type"]
#                         odds_values = odds_entry["odds"]

#                         MatchOdds.objects.update_or_create(
#                             match=match,
#                             sport=sport,
#                             market_type=market_type,
#                             defaults={"odds": odds_values}
#                         )

#                 if created:
#                     new_matches.append(match)
#                 else:
#                     updated_matches.append(match)

#             except Exception as match_error:
#                 logger.error(f"Error processing match: {match_data} - {match_error}")
#                 continue  # Skip this match and process the rest


# def fetch_live_games():
#     """Fetch live soccer games and update DB"""
#     url = f"{API_BASE_URL}/fixtures?status=LIVE"
#     with httpx.Client() as client:
#         response = client.get(url, headers=HEADERS)
#         if response.status_code != 200:
#             print("Error fetching live games:", response.status_code)
#             return

#         data = response.json()
#         sport = 'football'

#         # Step 1: Extract unique leagues
#         unique_leagues = set(
#             (game["league"], sport)
#             for game in data
#         )

#         # Step 2: Fetch existing leagues
#         existing_leagues = {
#             (league["league"], sport): league
#             for league in Leagues.objects.filter(
#                 league__in=[l[0] for l in unique_leagues],  
#                 sport__in=[l[2] for l in unique_leagues]
#             )
#         }

#             # Step 3: Insert missing leagues
#         new_leagues = [
#             Leagues(league=league, sport=sport)
#             for league, sport in unique_leagues
#             if (league, sport) not in existing_leagues
#         ]
#         Leagues.objects.bulk_create(new_leagues, ignore_conflicts=True)

#         # Refresh leagues
#         existing_leagues.update({
#             (league.league, league.country, league.sport): league
#             for league in Leagues.objects.all()
#         })

#         # Step 4: Process matches
#         new_matches = []
#         updated_matches = []

#         for match_data in data.get("response", []):
#             try:
#                 league_obj = existing_leagues.get((match_data["league"], sport))
#                 if not league_obj:
#                     print(f"Skipping fixture {match_data['fixture']["id"]} - League not found")
#                     continue

#                 # Prepare extras (handle different sports)
#                 extras_data = {key: match_data[key] for key in match_data if key not in ["id", "date", "league", "venue", "status", "odds"]}

#                 fixture = match_data["fixture"]
#                 league = fixture["league"]

#                 # home_team, _ = Team.objects.get_or_create(name=teams["home"]["name"])
#                 # away_team, _ = Team.objects.get_or_create(name=teams["away"]["name"])

#                 match, created = Matches.objects.update_or_create(
#                     match_id=fixture["id"],
#                     defaults={
#                         "sport": sport,
#                         "country": league["country"],
#                         "league": league["name"],
#                         "league_id": league["id"],
#                         "venue": fixture["venue"],
#                         "commence_datetime": fixture["date"],
#                         "status": fixture["status"],
#                         "extras": extras_data,
#                     },
#                 )

#                 # Step 5: Process odds
#                 odds_data = fixture.get("odds", [])
#                 if isinstance(odds_data, dict):  # ✅ Convert dictionary to list
#                     odds_data = [{"market_type": k, "odds": v} for k, v in odds_data.items()]


#                 for odds_entry in odds_data:
#                     if isinstance(odds_entry, dict) and "market_type" in odds_entry and "odds" in odds_entry:
#                         market_type = odds_entry["market_type"]
#                         odds_values = odds_entry["odds"]

#                         MatchOdds.objects.update_or_create(
#                             match=match,
#                             sport=sport,
#                             market_type=market_type,
#                             defaults={"odds": odds_values}
#                         )

#                 if created:
#                     new_matches.append(match)
#                 else:
#                     updated_matches.append(match)

#             except Exception as match_error:
#                 logger.error(f"Error processing match: {match_data} - {match_error}")
#                 continue  # Skip this match and process the rest



# def fetch_all_games():
#     """Fetch both prematch and live games"""
#     fetch_prematch_games()
#     fetch_live_games()
