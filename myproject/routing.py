from django.urls import re_path
from MoxBet import consumer

websocket_urlpatterns = [
    re_path(r"ws/live/(?P<sport>\w+)/$", consumer.LiveOddsConsumer.as_asgi()),
]
