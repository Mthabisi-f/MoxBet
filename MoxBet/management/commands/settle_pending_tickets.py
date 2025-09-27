from django.core.management.base import BaseCommand
from MoxBet.models import Tickets
from MoxBet.services.settlemet.sports import SportsSettlementHandler


class Command(BaseCommand):
    help = "Settle all pending tickets"

    def handle(self, *args, **options):
        pending_tickets = Tickets.objects.filter(status="Pending")
        if not pending_tickets.exists():
            self.stdout.write(self.style.WARNING("⚠ No pending tickets"))
            return

        status_counts = {}
        for ticket in pending_tickets:
            try:
                ticket = SportsSettlementHandler(ticket).settle()
                if ticket is None:
                    self.stdout.write(self.style.WARNING(f"⚠ Ticket #{ticket.id} returned None during settlement"))
                    continue
                status_counts[ticket.status] = status_counts.get(ticket.status, 0) + 1
                self.stdout.write(self.style.SUCCESS(f"✅ Settled Ticket #{ticket.id} → {ticket.status}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Failed to settle Ticket #{ticket.id}: {e}"))


        # Summary
        self.stdout.write("\n--- Settlement Summary ---")
        self.stdout.write(f"Total Settled: {sum(status_counts.values())}")
        for status, count in status_counts.items():
            self.stdout.write(f"  {status}: {count}")
