from channels.generic.websocket import AsyncWebsocketConsumer
import json

class LiveOddsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        sport = self.scope["url_route"]["kwargs"]["sport"].lower()
        self.group_name = f"live_odds_{sport}"

        # Join sport group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Receive broadcast from task.py
    async def odds_update(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
