from django.core.management.base import BaseCommand
from MoxBet.models import Tickets
from MoxBet.services.settlemet import settle_ticket

class Command(BaseCommand):
    help = "Settle all pending tickets"

    def handle(self, *args, **options):
        pending_tickets = Tickets.objects.filter(status='Pending')
        
        for ticket in pending_tickets:
            try:
                settle_ticket(ticket)
            except Exception as e:
                print(f"Error settling ticket {ticket.id} : {str(e)}")
        