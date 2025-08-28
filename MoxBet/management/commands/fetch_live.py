from django.core.management.base import BaseCommand
import asyncio
import os

from MoxBet.fetchers.client import api_client
from MoxBet.fetchers.sports import SPORTS
from MoxBet.fetchers.tasks import fetch_live_matches_and_odds

class Command(BaseCommand):
    help = "Fetch upcoming fixtures for all sports (manual test)"

    def handle(self, *args, **options):
        asyncio.run(self.run_fetch())

    async def run_fetch(self):
        async with api_client() as client:
            for sport, envkey in SPORTS.items():
                host = os.environ.get(envkey, os.environ.get("APISPORTS_HOST_FOOTBALL"))
                await fetch_live_matches_and_odds(client, sport, host)
