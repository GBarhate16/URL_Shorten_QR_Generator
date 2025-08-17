"""
ASGI config for saas_url project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

# Configure settings BEFORE importing Django/Channels modules
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_url.settings')

import django  # noqa: E402
django.setup()

from django.core.asgi import get_asgi_application  # noqa: E402

# Check if channels is available and configured
try:
    from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
    from channels.auth import AuthMiddlewareStack  # noqa: E402
    from .auth_middleware import JWTAuthMiddleware  # noqa: E402
    from urls.routing import websocket_urlpatterns  # noqa: E402
    
    # Channels is available - use WebSocket routing
    django_asgi_app = get_asgi_application()
    
    application = ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            JWTAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            )
        ),
    })
    
except ImportError:
    # Channels not available - use basic ASGI
    application = get_asgi_application()
except Exception as e:
    # Channels configuration error - fallback to basic ASGI
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Channels configuration failed: {e}. Falling back to basic ASGI.")
    application = get_asgi_application()
