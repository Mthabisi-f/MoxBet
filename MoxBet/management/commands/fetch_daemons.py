import asyncio
from django.core.management.base import BaseCommand
from MoxBet.fetchers.tasks import run_all

class Command(BaseCommand):
    help = "Run all scheduled fetchers for all sports (async daemons)."

    def handle(self, *args, **options):
        try:
            asyncio.run(run_all())
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Fetch daemons stopped."))


