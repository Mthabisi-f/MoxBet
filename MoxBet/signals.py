# from django.dispatch import receiver
# from django.db.models.signals import pre_save, post_save
# from MoxBet.models import Matches, Results, Tickets
# from django.core.management.base import BaseCommand
# from MoxBet.services.settlemet import settle_ticket
# from django.db.models import Q


# @receiver(pre_save, sender=Matches)
# def handle_finished_match(sender, instance, **kwargs):
#     """
#     Check if match status is being changed to 'Finished'
#     If so, create a Result entry and mark the match for deletion
#     """
#     if instance.pk:
#         try:
#             old_match = Matches.objects.get(pk=instance.pk)
#             if old_match.status != 'Finished' and instance.status == 'Finished':
#                 if not instance.extras['results']:
#                     print(f'No results for game with match id : {old_match.match_id}')
#                 else:
#                     Results.objects.create(
#                         match_id=instance.match_id,
#                         datetime=instance.commence_datetime,
#                         league_id=instance.league_id,
#                         sport=instance.sport,
#                         extras=instance.extras
#                     )
            
#                     # mark the match for deletion
#                     instance._delete_after_result = True
#         except Matches.DoesNotExist:
#             pass

# @receiver(post_save, sender=Matches)
# def delete_match_after_result(sender, instance, **kwargs):
#     """Delete the match after the Result has been created"""
#     if hasattr(instance, '_delete_after_result') and instance._delete_after_result:
#         instance.delete()

#         # Settle all tickets with this finished match
#         finished_match_id = instance.match_id
#         pending_tickets = Tickets.objects.filter(selections__contains=[{'match_id':finished_match_id}],)
#         for ticket in pending_tickets:
#             try:
#                 settle_ticket(ticket)
#             except Exception as e:
#                 print(f"Error settling ticket {ticket.id} : {str(e)}")





# # # MoxBet/signals.py
# # from django.db.models.signals import post_save, post_migrate
# # from django.dispatch import receiver
# # from django.apps import apps
# # from .models import MarketTypeMapping

# # @receiver(post_save, sender='MoxBet.MatchOdds')
# # def update_market_mappings(sender, instance, created, **kwargs):
# #     """
# #     Automatically create MarketTypeMapping when new market types appear in MatchOdds
# #     """
# #     # Get the model dynamically to avoid circular imports
# #     MarketTypeMapping = apps.get_model('MoxBet', 'MarketTypeMapping')
    
# #     # Check if this market_type exists for this sport in mappings
# #     mapping, created = MarketTypeMapping.objects.get_or_create(
# #         sport=instance.sport,
# #         backend_market=instance.market_type,
# #         defaults={'frontend_market': None}  # Admin will fill this later
# #     )
    
# #     if created:
# #         print(f"Created new market mapping: {instance.sport} - {instance.market_type}")

# # @receiver(post_migrate)
# # def populate_initial_mappings(sender, **kwargs):
# #     """
# #     Populate initial market mappings after migrations
# #     """
# #     # Only run for the specific app
# #     if sender.name == 'MoxBet':
# #         MatchOdds = apps.get_model('MoxBet', 'MatchOdds')
# #         MarketTypeMapping = apps.get_model('MoxBet', 'MarketTypeMapping')
        
# #         # Get all unique sport/market_type combinations
# #         market_types = MatchOdds.objects.values('sport', 'market_type').distinct()
        
# #         # Create mappings for each unique combination
# #         for mt in market_types:
# #             MarketTypeMapping.objects.get_or_create(
# #                 sport=mt['sport'],
# #                 backend_market=mt['market_type'],
# #                 defaults={'frontend_market': None}
# #             )
