import os
import sys
import asyncio
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import myproject.routing  

# --- Windows async fix ---
if sys.platform.startswith("win"):
    # Use ProactorEventLoop to avoid 'too many file descriptors' error
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# --- Django settings ---
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# --- ASGI application with HTTP + WebSocket support ---
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            myproject.routing.websocket_urlpatterns
        )
    ),
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



# # """
# # ASGI config for myproject project.

# # It exposes the ASGI callable as a module-level variable named ``application``.

# # For more information on this file, see
# # https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
# # """

# from django.core.asgi import get_asgi_application

# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# application = get_asgi_application()
