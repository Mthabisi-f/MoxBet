from celery import shared_task
from models import Tickets
from MoxBet.services.settlemet import settle_ticket
import logging

logger = logging.getLogger(__name__)

@shared_task
def auto_settle_tickets():
    pending_tickets = Tickets.objects.filter(status='Pending')
    for ticket in pending_tickets:
        try:
            settle_ticket(ticket)
        except Exception as e:
            logger.error(f"Failed to settle ticket {ticket.id}: {str(e)}")

