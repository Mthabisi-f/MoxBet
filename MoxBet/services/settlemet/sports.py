import logging
from .base import SettlementHandler
from MoxBet.models import MarketTypeMapping, Matches, MoneyBack, Results
import json
from decimal import Decimal
from django.utils import timezone

logger = logging.getLogger(__name__)

class SportsSettlementHandler(SettlementHandler):
    def settle(self):
        selections = self.ticket.selections
        results = []

        for i, selection in enumerate(selections):
            try:
                result = self._get_match_result(selection)
                if not result:
                    # Match not finished, leave selection pending
                    selection['status'] = 'Pending'
                    continue
            except Results.DoesNotExist:
                # Match result missing, leave selection pending
                selection['status'] = 'Pending'
                continue

            # Match has finished, settle this selection
            outcome = self._settle_selection(selection)

            selection['status'] = outcome['status']
            selection['results'] = {'home_score': result['home_score'],
                                    'away_score': result['away_score']}
            results.append(outcome)

        # Save updated selections back to ticket
        self.ticket.selections = selections

        # Check final ticket status
        statuses = [sel['status'] for sel in selections]
        total_selections = len(selections)
        lost_count = statuses.count('Lost')
        odds = [Decimal(str(sel.get('match_odds', 0))) for sel in selections]

        odds_meet = lambda min_odd: all(o >= min_odd for o in odds if o)


        print(f"{lost_count}")
        print(f"{statuses}")
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




    # def settle(self):
    #     results = []
    #     selections = self.ticket.selections
        
    #     for i, selection in enumerate(selections):
    #         try:
    #             result = self._get_match_result(selection)
    #             if not result:
    #                 selection['status'] = 'Pending'
    #                 continue
    #         except Results.DoesNotExist:
    #             selection['status'] = 'Pending'
    #             continue

    #         outcome = self._settle_selection(selection)
            

    #         selection['status'] = outcome['status']
    #         selection['results'] = result
            
    #         results.append(outcome)
    #         self.ticket.selections = selections
            
    #     statuses = [r['status'] for r in results]
    #     total_selections = len(self.ticket.selections)
    #     lost_count = statuses.count('Lost')
    #     odds = [Decimal(str(sel.get('match_odds', 0))) for sel in self.ticket.selections]

    #     #function to check if all odds >= threshold
    #     odds_meet = lambda min_odd: all(o >= min_odd for o in odds)

    #     # moneyback_awarded = False
    #     if all(status == 'Won' for status in statuses):
    #         self.ticket.status = 'Won'
    #         user = self.ticket.user
    #         user.balance += self.ticket.potential_win
    #         user.save()

    #     elif lost_count > 1:
    #         self.ticket.status = 'Lost'

    #     elif lost_count == 1:
    #         if 6 <= total_selections <= 10 and odds_meet(Decimal('1.5')):
    #             refund = self.ticket.stake # x1
    #         elif 11 <= total_selections <= 15 and odds_meet(Decimal('1.3')):
    #             refund = self.ticket.stake * Decimal('2') # x2
    #         elif 16 <= total_selections <= 20 and odds_meet(Decimal('1.3')):
    #             refund = self.ticket.stake * Decimal('5')  # x5
    #         elif total_selections >= 21 and odds_meet(Decimal('1.3')):
    #             refund = self.ticket.stake * Decimal('10')  # x10
    #         else:
    #             refund = None

    #         if refund:
    #             self.ticket.status = 'Refund'
    #             self.ticket.potential_win = refund
    #             self.ticket.user.balance += refund
    #             self.ticket.user.save()
                 
    #             #Record this in MoneyBack model
    #             MoneyBack.objects.create(
    #                 user = self.ticket.user,
    #                 ticket_id = self.ticket.id,
    #                 ticket_type = self.ticket.type,
    #                 minimum_odds = min(odds),
    #                 amount_returned = refund
    #             )
    #             # moneyback_awarded = True
    #         else:
    #             self.ticket.status = 'Lost'

    #     elif any(status == 'Pending' for status in statuses):
    #         self.ticket.status = 'Pending'
    #     else:
    #         self.ticket.status = 'Void'
    #     self.ticket.save()

    
    def _settle_selection(self, selection):
        try:
            mapping = MarketTypeMapping.objects.get(
                sport= selection['sport'],
                frontend_market= selection['market_type'],
            )
            # Dynamic function import example:
            module = __import__(f'MoxBet.services.settlemet.sports', fromlist=[mapping.settlement_function])
            func = getattr(module, mapping.settlement_function)
            return func(selection, self._get_match_result(selection))
        except Exception as e:
            logger.error(f"Sports settlement failed: {str(e)}")
            return {'status': 'ERROR'}

    def _get_match_result(self, selection):
        # Fetch from database 
        query_set = Results.objects.get(match_id=selection['match_id'], datetime=selection['date_time']) #, league_id=selection['league_id']
        return query_set.extras['results'] if query_set.extras['results'] else None

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