import os
import asyncio
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from myproject.routing import websocket_urlpatterns
from MoxBet.redis_client import redis_client  # your singleton Redis client

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

# Get the default Django ASGI application
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})

# -------------------------
# Lifespan startup/shutdown
# -------------------------
# Daphne / Uvicorn support lifespan events
async def lifespan(scope, receive, send):
    # Startup: nothing to do
    while True:
        message = await receive()
        if message["type"] == "lifespan.startup":
            await send({"type": "lifespan.startup.complete"})
        elif message["type"] == "lifespan.shutdown":
            # Cleanly close Redis client on shutdown
            try:
                await redis_client.close()
                await redis_client.connection_pool.disconnect()
                print("[REDIS] Closed Redis connection cleanly on shutdown")
            except Exception as e:
                print(f"[REDIS] Error closing Redis: {e}")
            await send({"type": "lifespan.shutdown.complete"})
            return

# Wrap your main application with lifespan support
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
    "lifespan": lifespan
})



# import os
# from django.core.asgi import get_asgi_application
# from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.auth import AuthMiddlewareStack
# import asyncio
# import sys

# if sys.platform.startswith("win"):
#     asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# import myproject.routing  

# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# application = ProtocolTypeRouter({
#     "http": get_asgi_application(),
#     "websocket": AuthMiddlewareStack(
#         URLRouter(
#             myproject.routing.websocket_urlpatterns
#         )
#     ),
# })

