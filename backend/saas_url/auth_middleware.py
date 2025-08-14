from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings


User = get_user_model()


class JWTAuthMiddleware:
    """
    Custom JWT Auth middleware for Channels that authenticates a user via
    a 'token' query parameter using DRF SimpleJWT.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Close old DB connections to prevent usage of timed out connections
        close_old_connections()

        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token_list = query_params.get('token')
        user = None

        if token_list:
            token = token_list[0]
            try:
                # Validate token signature/expiry
                UntypedToken(token)
                # Decode payload to get user id
                payload = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get('user_id')
                if user_id:
                    user = await database_sync_to_async(User.objects.get)(id=user_id)
            except (InvalidToken, TokenError, Exception):
                user = None

        scope['user'] = user if user is not None else AnonymousUser()
        return await self.inner(scope, receive, send)
