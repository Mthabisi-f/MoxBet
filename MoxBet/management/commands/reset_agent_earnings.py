# management/commands/reset_agent_earnings.py
from django.core.management.base import BaseCommand
from MoxBet.models import Agents

class Command(BaseCommand):
    help = "Reset agent earnings at the start of a new month"

    def handle(self, *args, **kwargs):
        Agents.objects.update(total_earnings=0)
        self.stdout.write(self.style.SUCCESS("✅ Agent earnings reset for new month"))
