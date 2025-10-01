from django.core.management.base import BaseCommand
from MoxBet.models import Tickets
from MoxBet.services.settlemet.sports import SportsSettlementHandler


class Command(BaseCommand):
    help = "Settle all pending tickets"

    def handle(self, *args, **options):
        # Get all tickets
        all_tickets = Tickets.objects.all()

        # Filter tickets that have at least one pending selection
        pending_tickets = [
            ticket for ticket in all_tickets
            if any(sel.get("status") == "Pending" for sel in ticket.selections)
        ]

        if not pending_tickets:
            self.stdout.write(self.style.WARNING("⚠ No tickets with pending selections"))
            return

        status_counts = {}
        for ticket in pending_tickets:
            try:
                settled_ticket = SportsSettlementHandler(ticket).settle()
                if settled_ticket is None:
                    self.stdout.write(self.style.WARNING(f"⚠ Ticket #{ticket.id} returned None during settlement"))
                    continue

                status_counts[settled_ticket.status] = status_counts.get(settled_ticket.status, 0) + 1
                self.stdout.write(self.style.SUCCESS(f"✅ Settled Ticket #{settled_ticket.id} → {settled_ticket.status}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Failed to settle Ticket #{ticket.id}: {e}"))

        # Summary
        self.stdout.write("\n--- Settlement Summary ---")
        self.stdout.write(f"Total Settled: {sum(status_counts.values())}")
        for status, count in status_counts.items():
            self.stdout.write(f"  {status}: {count}")
