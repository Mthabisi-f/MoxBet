
import json
from django.db import transaction
from django.core.cache import cache
from MoxBet.models import (
    Matches, Leagues, MatchOdds, Standings, Lineup,
    Team, Player, Injury, Competition, Transfer, Prediction
)

def ensure_league(country, league, sport):
    league, _ = Leagues.objects.get_or_create(
        league=league or "Unknown",
        country=country or "Unknown",
        sport=sport or "Unknown",
    )
    return league

@transaction.atomic
def upsert_fixture(nf):
    # league_obj = ensure_league(nf.get("country"), nf.get("league", {}).get("name"), nf.get("league", {}).get("sport"))
    match, created = Matches.objects.update_or_create(
        match_id=nf.get("match_id"),
        defaults={
            "sport": nf.get("sport"),
            "country": nf.get("country"),
            "league": nf.get("league", {}),
            "league_id": nf.get("league_id"),
            "venue": nf.get("venue"),
            "commence_datetime": nf.get("commence_datetime"),
            "status": nf.get("status"),
            "extras": nf.get("extras"),
        }
    )
    return match

@transaction.atomic
def upsert_odds(match, sport, market_type, odds_payload, extras_odds_data):
    match_obj = Matches.objects.get(match_id=match)
    match_odds, _created = MatchOdds.objects.update_or_create(
        match=match_obj,
        market_type=market_type,
        defaults={"odds": odds_payload, "sport": sport, "extras": extras_odds_data}
    )
    return match_odds
   
@transaction.atomic
def upsert_standings(league_obj, season, sport, standings_payload):
    Standings.objects.update_or_create(
        league=league_obj,
        season=season,
        sport=sport,
        defaults={"standings": standings_payload}
    )

@transaction.atomic
def upsert_lineup(match_obj, sport, lineup_payload):
    Lineup.objects.update_or_create(
        match=match_obj,
        sport=sport,
        defaults={"lineup": lineup_payload}
    )

@transaction.atomic
def upsert_team(team_payload):
    Team.objects.update_or_create(
        team_id=team_payload["team_id"],
        defaults={
            "name": team_payload.get("name"),
            "logo": team_payload.get("logo"),
            "country": team_payload.get("country"),
            "sport": team_payload.get("sport"),
            "extras": team_payload.get("extras"),
        }
    )

@transaction.atomic
def upsert_player(player_payload, team_obj=None):
    p, _ = Player.objects.update_or_create(
        player_id=player_payload["player_id"],
        defaults={
            "name": player_payload.get("name"),
            "photo": player_payload.get("photo"),
            "nationality": player_payload.get("nationality"),
            "position": player_payload.get("position"),
            "sport": player_payload.get("sport"),
            "extras": player_payload.get("extras"),
            "team": team_obj
        }
    )
    return p

@transaction.atomic
def upsert_injury(player_obj, team_obj, sport, injury_payload):
    Injury.objects.create(player=player_obj, team=team_obj, sport=sport, details=injury_payload)

@transaction.atomic
def upsert_competition(comp_payload):
    Competition.objects.update_or_create(
        competition_id=comp_payload["competition_id"],
        defaults={
            "name": comp_payload.get("name"),
            "country": comp_payload.get("country"),
            "season": comp_payload.get("season"),
            "sport": comp_payload.get("sport"),
            "extras": comp_payload.get("extras"),
        }
    )

@transaction.atomic
def upsert_transfer(transfer_payload):
    Transfer.objects.create(details=transfer_payload)

@transaction.atomic
def upsert_prediction(match_obj, sport, payload):
    Prediction.objects.update_or_create(
        match=match_obj,
        sport=sport,
        defaults={"payload": payload}
    )

def cache_changed(cache_obj, key, payload, publish=None):
    # store a compact JSON string to Redis/Django cache; short TTL
    try:
        cache_obj.set(key, payload, timeout=20)
        if publish:
            publish(json.dumps(payload))
    except Exception:
        pass




