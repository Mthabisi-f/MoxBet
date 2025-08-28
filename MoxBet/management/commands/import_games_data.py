import json
import logging
from django.core.management.base import BaseCommand
from MoxBet.models import Matches, Leagues, MatchOdds, Tickets
from datetime import datetime
from zoneinfo import ZoneInfo

# Setup logging
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Import matches and odds while ensuring leagues exist"

    def handle(self, *args, **kwargs):
        try:
            with open("static/js/data.json", "r") as file:
                data = json.load(file)

            # Step 1: Extract unique leagues
            unique_leagues = set(
                (game["league"], game["country"], game["sport_name"])
                for game in data
            )

            # Step 2: Fetch existing leagues
            existing_leagues = {
                (league.league, league.country, league.sport): league
                for league in Leagues.objects.filter(
                    league__in=[l[0] for l in unique_leagues],  
                    country__in=[l[1] for l in unique_leagues],
                    sport__in=[l[2] for l in unique_leagues]
                )
            }

            # Step 3: Insert missing leagues
            new_leagues = [
                Leagues(league=league_name, country=country, sport=sport)
                for league_name, country, sport in unique_leagues
                if (league_name, country, sport) not in existing_leagues
            ]
            Leagues.objects.bulk_create(new_leagues, ignore_conflicts=True)

            # Refresh leagues
            existing_leagues.update({
                (league.league, league.country, league.sport): league
                for league in Leagues.objects.all()
            })

            # Step 4: Process matches
            new_matches = []
            updated_matches = []
            match_odds = []

            for game in data:
                try:
                    commence_datetime = game.get("commence_datetime", "")
                    if commence_datetime:
                        commence_datetime = datetime.fromisoformat(commence_datetime.replace("Z", "")).replace(tzinfo=ZoneInfo("UTC"))

                    league_obj = existing_leagues.get((game["league"], game["country"], game["sport_name"]))
                    if not league_obj:
                        print(f"Skipping match {game['match_id']} - League not found")
                        continue

                    # Prepare extras (handle different sports)
                    extras_data = {key: game[key] for key in game if key not in ["match_id", "sport_name", "country", "league", "venue", "commence_datetime", "status", "odds"]}

                    # Insert or update match
                    match, created = Matches.objects.update_or_create(
                        match_id=game["match_id"],
                        defaults={
                            "sport": game["sport_name"],
                            "country": game["country"],
                            "league": game["league"],
                            "league_id": league_obj,
                            "venue": game["venue"],
                            "commence_datetime": commence_datetime,
                            "status": game["status"],
                            "extras": extras_data
                        }
                    )

                    # Step 5: Process odds
                    odds_data = game.get("odds", [])
                    if isinstance(odds_data, dict):  # ✅ Convert dictionary to list
                        odds_data = [{"market_type": k, "odds": v} for k, v in odds_data.items()]

                    # print(f"DEBUG: Type of odds for match {game['match_id']}: {type(odds_data)}")

                    for odds_entry in odds_data:
                        if isinstance(odds_entry, dict) and "market_type" in odds_entry and "odds" in odds_entry:
                            market_type = odds_entry["market_type"]
                            odds_values = odds_entry["odds"]

                            MatchOdds.objects.update_or_create(
                                match=match,
                                sport=game["sport_name"],
                                market_type=market_type,
                                defaults={"odds": odds_values}
                            )

                    if created:
                        new_matches.append(match)
                    else:
                        updated_matches.append(match)
                       


                except Exception as match_error:
                    logger.error(f"Error processing match: {game} - {match_error}")
                    continue  # Skip this match and process the rest

            self.stdout.write(self.style.SUCCESS("Games imported succesfully"))
            print(f"Inserted {len(new_matches)} new matches, updated {len(updated_matches)} matches.")

        except Exception as e:
            logger.error(f"Error importing games: {e}", exc_info=True)
            print(f"An error occurred: {e}")
