import logging
from .base import SettlementHandler
from MoxBet.models import MoneyBack, WinBoost
from asgiref.sync import async_to_sync
from decimal import Decimal
from django.utils import timezone
from MoxBet.services.settlemet.tasks import get_finished_fixtures_sync

logger = logging.getLogger(__name__)

class SportsSettlementHandler(SettlementHandler):
    def settle(self):
        try:
            finished_results = async_to_sync(get_finished_fixtures_sync)()
        except Exception as e:
            logger.error(f"[SETTLEMENT] Error fetching finished fixtures: {e}")
            finished_results = []

        selections = self.ticket.selections
        results = []

        for selection in selections:
            result = self._get_match_result(selection, finished_results)

            # If no result, leave pending
            if not result:
                selection["status"] = "Pending"
                continue

            # Settle normally
            outcome = self._settle_selection(selection, result)
            selection["status"] = outcome["status"]

            # Set match_odds to 1 if cancelled/postponed inside _settle_selection
            if selection["status"] in ["Cancelled", "Postponed"]:
                selection["match_odds"] = 1

            selection["results"] = result
            results.append(outcome)

        # Save updated selections back to ticket
        self.ticket.selections = selections

        # Only consider active selections for lost_count and win calculations
        active_selections = [sel for sel in selections if sel["status"] not in ["Cancelled", "Postponed"]]
        statuses = [sel["status"] for sel in active_selections]
        total_selections = len(active_selections)
        lost_count = statuses.count("Lost")

        # Recalculate total_odds after dividing by cancelled/postponed odds (which are 1)
        total_odds = Decimal("1")
        for sel in selections:
            total_odds *= Decimal(str(sel.get("match_odds", 1)))

        # Calculate win_boost percentage
        if total_selections > 21:
            win_boost_percentage = Decimal("0.5")
        else:
            boost = WinBoost.objects.filter(number_of_selections=total_selections).first()
            win_boost_percentage = Decimal(boost.win_boost_percentage / 100) if boost else Decimal("0")

        # Calculate potential win
        potential_win = self.ticket.stake * total_odds * (1 + win_boost_percentage)

        # Final ticket status logic
        if all(status == "Won" for status in statuses) and total_selections > 0:
            self.ticket.status = "Won"
            self.ticket.potential_win = potential_win
            self.ticket.user.balance += potential_win
            self.ticket.user.save()

        elif lost_count > 1:
            self.ticket.status = "Lost"
            self.ticket.potential_win = Decimal("0")

        elif lost_count == 1:
            refund = None
            odds_list = [Decimal(str(sel.get("match_odds", 1))) for sel in selections if sel["status"] not in ["Cancelled", "Postponed"]]
            odds_meet = lambda min_odd: all(o >= min_odd for o in odds_list)

            if 6 <= total_selections <= 10 and odds_meet(Decimal("1.5")):
                refund = self.ticket.stake
            elif 11 <= total_selections <= 15 and odds_meet(Decimal("1.3")):
                refund = self.ticket.stake * Decimal("2")
            elif 16 <= total_selections <= 20 and odds_meet(Decimal("1.3")):
                refund = self.ticket.stake * Decimal("5")
            elif total_selections >= 21 and odds_meet(Decimal("1.3")):
                refund = self.ticket.stake * Decimal("10")

            if refund:
                self.ticket.status = "Refund"
                self.ticket.potential_win = refund
                self.ticket.user.balance += refund
                self.ticket.user.save()

                MoneyBack.objects.create(
                    user=self.ticket.user,
                    ticket_id=self.ticket.id,
                    ticket_type=self.ticket.type,
                    minimum_odds=min(odds_list, default=0),
                    amount_returned=refund,
                )
            else:
                self.ticket.status = "Lost"
                self.ticket.potential_win = Decimal("0")

        elif any(status == "Pending" for status in statuses):
            self.ticket.status = "Pending"
            self.ticket.potential_win = Decimal("0")

        else:
            self.ticket.status = "Void"
            self.ticket.potential_win = Decimal("0")

        self.ticket.total_odds = total_odds
        self.ticket.win_boost = win_boost_percentage
        self.ticket.settled_at = timezone.now()
        self.ticket.save()

        return self.ticket

    def _settle_selection(self, selection, result):
        if selection.get("status") not in [None, "Pending", "ERROR"]:
            return {"status": selection["status"]}

        func = MARKET_SETTLEMENT_MAPPING.get(selection["market_type"])
        if not func:
            logger.error(f"[SETTLEMENT] No settlement function for {selection['market_type']}")
            return {"status": "ERROR"}

        return func(selection, result)

    def _get_match_result(self, selection, finished_results):
        for match in finished_results:
            if (
                str(match.get("match_id")) == str(selection.get("match_id"))
                and str(match.get("league_id")) == str(selection.get("league_id"))
            ):
                status_short = match.get("status", "").upper()
                if status_short in ["CANC", "PST"]:
                    selection["status"] = "Cancelled" if status_short == "CANC" else "Postponed"
                    selection["match_odds"] = 1
                    selection["results"] = match.get("extras", {})
                    return None  # skip settlement for this selection
                return match.get("extras", {})  # normal finished match
        return None


# Sports-specific settlement functions
def settle_soccer_winner(selection, result):
    """Settle 1X2 (Full Time Result)"""
    # Determine which score to use based on market type
    market_type = selection['market_type'].lower()
    pred = selection['prediction']

    if '1st half' in market_type:
        home = result["score"]["halftime"]["home"]
        away = result["score"]["halftime"]["away"]
    elif '2nd half' in market_type:
        home_ft = result["score"]["fulltime"]["home"]
        away_ft = result["score"]["fulltime"]["away"]
        home_ht = result["score"]["halftime"]["home"]
        away_ht = result["score"]["halftime"]["away"]
        home = home_ft - home_ht
        away = away_ft - away_ht
    else:
        home = result["score"]["fulltime"]["home"]
        away = result["score"]["fulltime"]["away"]
        
    if pred == '1':
        return {'status': 'Won' if home > away else 'Lost'}
    elif pred == 'X':
        return {'status': 'Won' if home == away else 'Lost'}
    elif pred == '2':
        return {'status': 'Won' if home < away else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_double_chance(selection, result):
    """Settle Double Chance markets"""
    # Determine which score to use based on market type
    market_type = selection['market_type'].lower()
    pred = selection['prediction']

    if '1st half' in market_type:
        home = result["score"]["halftime"]["home"]
        away = result["score"]["halftime"]["away"]
    elif '2nd half' in market_type:
        home_ft = result["score"]["fulltime"]["home"]
        away_ft = result["score"]["fulltime"]["away"]
        home_ht = result["score"]["halftime"]["home"]
        away_ht = result["score"]["halftime"]["away"]
        home = home_ft - home_ht
        away = away_ft - away_ht
    else:
        home = result["score"]["fulltime"]["home"]
        away = result["score"]["fulltime"]["away"]
    
    if pred == '1X':
        return {'status': 'Won' if home >= away else 'Lost'}
    elif pred == '12':
        return {'status': 'Won' if home != away else 'Lost'}
    elif pred == 'X2':
        return {'status': 'Won' if home <= away else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_goals_over_under(selection, result):
    """
    Dynamically settle all Over/Under markets:
    - Full Match, 1st Half, 2nd Half, Home Team, Away Team
    """
    market_type = selection['market_type'].lower()
    pred = selection['prediction'].lower().strip()
    
    # Determine which score to use based on market type
    if '1st half' in market_type:
        home = result["score"]["halftime"]["home"]
        away = result["score"]["halftime"]["away"]
    elif '2nd half' in market_type:
        home_ft = result["score"]["fulltime"]["home"]
        away_ft = result["score"]["fulltime"]["away"]
        home_ht = result["score"]["halftime"]["home"]
        away_ht = result["score"]["halftime"]["away"]
        home = home_ft - home_ht
        away = away_ft - away_ht
    elif 'home team' in market_type:
        home = result["score"]["fulltime"]["home"]
        away = 0  # Only home team goals matter
    elif 'away team' in market_type:
        home = 0  # Only away team goals matter
        away = result["score"]["fulltime"]["away"]
    else:
        # Full match
        home = result["score"]["fulltime"]["home"]
        away = result["score"]["fulltime"]["away"]
    
    # For team-specific markets, use only that team's goals
    if 'home team' in market_type:
        total_goals = home
    elif 'away team' in market_type:
        total_goals = away
    else:
        total_goals = home + away
    
    # Extract the number and type from prediction
    parts = pred.split()
    if len(parts) != 2:
        return {'status': 'INVALID_PREDICTION'}
    
    bet_type, line_str = parts
    line_str = line_str.replace(',', '.')
    
    try:
        line = float(line_str)
    except ValueError:
        return {'status': 'INVALID_PREDICTION'}
    
    if bet_type == 'over':
        return {'status': 'Won' if total_goals > line else 'Lost'}
    elif bet_type == 'under':
        return {'status': 'Won' if total_goals < line else 'Lost'}
    else:
        return {'status': 'INVALID_PREDICTION'}


def settle_soccer_both_teams_to_score(selection, result):
    """Settle BTTS markets"""
    # Determine which score to use based on market type
    market_type = selection['market_type'].lower()
    pred = selection['prediction']

    if '1st half' in market_type:
        home = result["score"]["halftime"]["home"]
        away = result["score"]["halftime"]["away"]
    elif '2nd half' in market_type:
        home_ft = result["score"]["fulltime"]["home"]
        away_ft = result["score"]["fulltime"]["away"]
        home_ht = result["score"]["halftime"]["home"]
        away_ht = result["score"]["halftime"]["away"]
        home = home_ft - home_ht
        away = away_ft - away_ht
    else:
        home = result["score"]["fulltime"]["home"]
        away = result["score"]["fulltime"]["away"]
    
    both_scored = home > 0 and away > 0
    
    if pred == 'yes':
        return {'status': 'Won' if both_scored else 'Lost'}
    elif pred == 'no':
        return {'status': 'Won' if not both_scored else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_correct_score(selection, result):
    """Settle Correct Score markets"""
    # Determine which score to use based on market type
    market_type = selection['market_type'].lower()
    pred = selection['prediction']

    if '1st half' in market_type:
        home = result["score"]["halftime"]["home"]
        away = result["score"]["halftime"]["away"]
    elif '2nd half' in market_type:
        home_ft = result["score"]["fulltime"]["home"]
        away_ft = result["score"]["fulltime"]["away"]
        home_ht = result["score"]["halftime"]["home"]
        away_ht = result["score"]["halftime"]["away"]
        home = home_ft - home_ht
        away = away_ft - away_ht
    else:
        home = result["score"]["fulltime"]["home"]
        away = result["score"]["fulltime"]["away"]
    
    # Handle different score formats
    if ':' in pred:
        expected_home, expected_away = map(int, pred.split(':'))
    elif '-' in pred:
        expected_home, expected_away = map(int, pred.split('-'))
    else:
        return {'status': 'INVALID_PREDICTION'}
    
    return {'status': 'Won' if home == expected_home and away == expected_away else 'Lost'}


def settle_soccer_odd_even(selection, result):
    """Settle Odd/Even markets"""
    market_type = selection['market_type'].lower()
    pred = selection['prediction'].lower()
    
    if '1st half' in market_type:
        total_goals = result["score"]["halftime"]["home"] + result["score"]["halftime"]["away"]
    elif '2nd half' in market_type:
        home_ft = result["score"]["fulltime"]["home"]
        away_ft = result["score"]["fulltime"]["away"]
        home_ht = result["score"]["halftime"]["home"]
        away_ht = result["score"]["halftime"]["away"]
        total_goals = (home_ft - home_ht) + (away_ft - away_ht)
    else:
        # Full match
        total_goals = result["score"]["fulltime"]["home"] + result["score"]["fulltime"]["away"]
    
    is_even = total_goals % 2 == 0
    
    if pred == 'even':
        return {'status': 'Won' if is_even else 'Lost'}
    elif pred == 'odd':
        return {'status': 'Won' if not is_even else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_halftime_fulltime(selection, result):
    """Settle HT/FT markets"""
    ht_home = result["score"]["halftime"]["home"]
    ht_away = result["score"]["halftime"]["away"]
    ft_home = result["score"]["fulltime"]["home"]
    ft_away = result["score"]["fulltime"]["away"]
    
    pred = selection['prediction']
    
    # Determine halftime result
    if ht_home > ht_away:
        ht_result = '1'
    elif ht_home == ht_away:
        ht_result = 'X'
    else:
        ht_result = '2'
    
    # Determine fulltime result
    if ft_home > ft_away:
        ft_result = '1'
    elif ft_home == ft_away:
        ft_result = 'X'
    else:
        ft_result = '2'
    
    actual_result = f"{ht_result}/{ft_result}"
    return {'status': 'Won' if pred == actual_result else 'Lost'}


# def settle_soccer_team_to_score_first(selection, result):
#     """Settle Team To Score First"""
#     # This requires additional data about scoring timeline
#     # For now, we'll use a simplified version
#     home = result["score"]["fulltime"]["home"]
#     away = result["score"]["fulltime"]["away"]
#     pred = selection['prediction']
    
#     if home > 0 and away == 0:
#         first_scorer = '1'
#     elif away > 0 and home == 0:
#         first_scorer = '2'
#     elif home > 0 and away > 0:
#         # Both scored - need more data to determine who scored first
#         # For simplicity, we'll consider it a draw for first scorer
#         first_scorer = 'X'
#     else:
#         first_scorer = 'X'  # No goals
    
#     return {'status': 'Won' if pred == first_scorer else 'Lost'}


def settle_soccer_exact_goals(selection, result):
    """Settle Exact Total Goals"""
    total_goals = result["score"]["fulltime"]["home"] + result["score"]["fulltime"]["away"]
    pred = selection['prediction']
    
    if pred == '7+':
        return {'status': 'Won' if total_goals >= 7 else 'Lost'}
    else:
        try:
            expected_goals = int(pred)
            return {'status': 'Won' if total_goals == expected_goals else 'Lost'}
        except ValueError:
            return {'status': 'INVALID_PREDICTION'}


def settle_soccer_win_to_nil(selection, result):
    """Settle Win To Nil"""
    home = result["score"]["fulltime"]["home"]
    away = result["score"]["fulltime"]["away"]
    pred = selection['prediction']
    
    if pred == '1':  # Home win to nil
        return {'status': 'Won' if home > away and away == 0 else 'Lost'}
    elif pred == '2':  # Away win to nil
        return {'status': 'Won' if away > home and home == 0 else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_combo_markets(selection, result):
    """Settle combined markets like 1X2 & BTTS, 1X2 & Over/Under"""
    pred = selection['prediction'].lower()
    home = result["score"]["fulltime"]["home"]
    away = result["score"]["fulltime"]["away"]
    
    # Parse the combination
    if '&' in pred:
        parts = [p.strip() for p in pred.split('&')]
        if len(parts) != 2:
            return {'status': 'INVALID_PREDICTION'}
        
        main_pred, secondary_pred = parts
        
        # Check main prediction (1X2)
        main_result = None
        if main_pred in ['1', 'X', '2']:
            if main_pred == '1':
                main_result = home > away
            elif main_pred == 'X':
                main_result = home == away
            elif main_pred == '2':
                main_result = home < away
        
        # Check secondary prediction
        secondary_result = None
        if 'o' in secondary_pred or 'u' in secondary_pred:
            # Over/Under
            line_str = secondary_pred.replace('o', '').replace('u', '').strip()
            try:
                line = float(line_str)
                total_goals = home + away
                if 'o' in secondary_pred:
                    secondary_result = total_goals > line
                else:
                    secondary_result = total_goals < line
            except ValueError:
                return {'status': 'INVALID_PREDICTION'}
        elif secondary_pred in ['y', 'n']:
            # BTTS
            both_scored = home > 0 and away > 0
            secondary_result = both_scored if secondary_pred == 'y' else not both_scored
        
        if main_result is not None and secondary_result is not None:
            return {'status': 'Won' if main_result and secondary_result else 'Lost'}
    
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_who_will_win(selection, result):
    """Settle Who Will Win (Draw No Bet)"""
    home = result["score"]["fulltime"]["home"]
    away = result["score"]["fulltime"]["away"]
    pred = selection['prediction']
    
    if home == away:
        return {'status': 'Void'}  # Draw = void bet
    
    if pred == '1':
        return {'status': 'Won' if home > away else 'Lost'}
    elif pred == '2':
        return {'status': 'Won' if home < away else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


# Market Type Mapping
MARKET_SETTLEMENT_MAPPING = {
    # 1X2 Markets
    "Match Winner": settle_soccer_winner,
    "FullTime": settle_soccer_winner,
    "First Half Winner": settle_soccer_winner,
    "Second Half Winner": settle_soccer_winner,
    
    # Double Chance Markets
    "Double Chance": settle_soccer_double_chance,
    "Double Chance 1st Half": settle_soccer_double_chance,
    
    # Over/Under Markets
    "Goals Over/Under": settle_soccer_goals_over_under,
    "Goals Over/Under 1st Half": settle_soccer_goals_over_under,
    "Goals Over/Under 2nd Half": settle_soccer_goals_over_under,
    "Home Team Over/Under": settle_soccer_goals_over_under,
    "Away Team Over/Under": settle_soccer_goals_over_under,
    
    # Both Teams To Score
    "Both Teams To Score": settle_soccer_both_teams_to_score,
    "BTTS": settle_soccer_both_teams_to_score,
    
    # Correct Score
    "Correct Score": settle_soccer_correct_score,
    "Correct Score 1st Half": settle_soccer_correct_score,
    
    # Odd/Even
    "Odd/Even FT": settle_soccer_odd_even,
    "Odd/Even 1st Half": settle_soccer_odd_even,
    "Odd/Even 2nd Half": settle_soccer_odd_even,
    
    # Halftime/Fulltime
    "Halftime/Fulltime": settle_soccer_halftime_fulltime,
    
    # Team To Score First
    # "Team To Score First": settle_soccer_team_to_score_first,
    
    # Exact Goals
    "Exact Total Goals": settle_soccer_exact_goals,
    
    # Win To Nil
    "Win To Nil": settle_soccer_win_to_nil,
    
    # Who Will Win (Draw No Bet)
    "Who Will Win": settle_soccer_who_will_win,
    
    # Combined Markets
    "1X2 & BTTS": settle_soccer_combo_markets,
    "1X2 & Over/Under": settle_soccer_combo_markets,
    "BTTS & Over/Under": settle_soccer_combo_markets,
}
