import logging
from .base import SettlementHandler
from MoxBet.models import MoneyBack
import json, asyncio
from decimal import Decimal
from django.utils import timezone


logger = logging.getLogger(__name__)



class SportsSettlementHandler(SettlementHandler):
    def settle(self):
        selections = self.ticket.selections
        results = []

        for i, selection in enumerate(selections):
            result = self._get_match_result(selection)
            if not result:
                # Match not finished, leave selection pending
                continue
        
            # Match has finished and its there in redis, settle this selection
            outcome = self._settle_selection(selection)

            selection['status'] = outcome['status']
            selection['results'] = result
            results.append(outcome)

        # Save updated selections back to ticket
        self.ticket.selections = selections

        # Check final ticket status
        statuses = [sel['status'] for sel in selections]
        total_selections = len(selections)
        lost_count = statuses.count('Lost')
        odds = [Decimal(str(sel.get('match_odds', 0))) for sel in selections]

        odds_meet = lambda min_odd: all(o >= min_odd for o in odds if o)


        if all(status == 'Won' for status in statuses):
            self.ticket.status = 'Won'
            user = self.ticket.user
            user.balance += self.ticket.potential_win
            user.save()

        elif lost_count > 1:
            self.ticket.status = 'Lost'

        elif lost_count == 1: 
            refund = None
            if 6 <= total_selections <= 10 and odds_meet(Decimal('1.5')):
                refund = self.ticket.stake
            elif 11 <= total_selections <= 15 and odds_meet(Decimal('1.3')):
                refund = self.ticket.stake * Decimal('2')
            elif 16 <= total_selections <= 20 and odds_meet(Decimal('1.3')):
                refund = self.ticket.stake * Decimal('5')
            elif total_selections >= 21 and odds_meet(Decimal('1.3')):
                refund = self.ticket.stake * Decimal('10')

            if refund:
                self.ticket.status = 'Refund'
                self.ticket.potential_win = refund
                self.ticket.user.balance += refund
                self.ticket.user.save()

                MoneyBack.objects.create(
                    user=self.ticket.user,
                    ticket_id=self.ticket.id,
                    ticket_type=self.ticket.type,
                    minimum_odds=min(odds),
                    amount_returned=refund
                )
            else:
                self.ticket.status = 'Lost'

        elif any(status == 'Pending' for status in statuses):
            self.ticket.status = 'Pending'
        else:
            self.ticket.status = 'Void'

        self.ticket.settled_at = timezone.now()
        self.ticket.save()

        
    def _settle_selection(self, selection):
        # If already settled (Won/Lost/Void/Refund), don't touch it
        if selection.get('status') not in [None, 'Pending', 'ERROR']:
            return {'status': selection['status']}

        result = self._get_match_result(selection)
        if not result:
            return {'status': 'Pending'}

        func = MARKET_SETTLEMENT_MAPPING.get(selection['market_type'])
        if not func:
            logger.error(f"Sports settlement function not found for {selection['market_type']}")
            return {'status': 'ERROR'}

        return func(selection, result)


    def _get_match_result(self, selection):
        from MoxBet.fetchers.tasks import get_finished_fixtures

        # Fetch finished results from Redis
        finished_results = asyncio.run(get_finished_fixtures())

        for match in finished_results:
            if match["match_id"] == selection["match_id"] and match["datetime"] == selection['date_time'] and match["league_id"]== selection['league_id']:
                return match["extras"]
        return None


# Sports-specific functions
def settle_soccer_fulltime(selection, result):
    home, away = result['home_score'], result['away_score']
    pred = selection['prediction']
    if pred == '1':
        return {'status': 'Won' if home > away else 'Lost'}
    elif pred == 'X':
        return {'status': 'Won' if home == away else 'Lost'}
    elif pred == '2':
        return {'status': 'Won' if home < away else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_double_chance(selection, result):
    home, away = result['home_score'], result['away_score']
    pred = selection['prediction']
    if pred == '1X':
        return {'status': 'Won' if home >= away else 'Lost'}
    elif pred == '12':
        return {'status': 'Won' if home != away else 'Lost'}
    elif pred == 'X2':
        return {'status': 'Won' if home <= away else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


def settle_soccer_fulltime_over_under_25(selection, result):
    home, away = result['home_score'], result['away_score']
    pred = selection['prediction']
    if pred == 'Over':
        return {'status': 'Won' if home + away >= 3 else 'Lost'}
    elif pred == 'Under':
        return {'status': 'Won' if home + away < 3 else 'Lost'}
    return {'status': 'INVALID_PREDICTION'}


MARKET_SETTLEMENT_MAPPING = {
    # --- Settlement Functions for soccer --- #
    "Fulltime": settle_soccer_fulltime,
    "Double Chance": settle_soccer_double_chance,
    "Over/Under 2.5": settle_soccer_fulltime_over_under_25,
    # Add more mappings as needed
}