import logging

import jwt
from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework_jwt.settings import api_settings

logger = logging.getLogger(__name__)


class TokenWrongIssuer(Exception):
    pass


class HasAccessToken(BasePermission):
    """
    Allow requests having valid ID Token.

    https://tools.ietf.org/html/draft-ietf-oauth-json-web-token-31
    Expected Token:
    Header {
        "alg": "HS256",
        "typ": "JWT"
    }
    Claims {
        "sub": "<USER ANONYMOUS ID>",
        "exp": <EXPIRATION TIMESTAMP>,
        "iat": <ISSUED TIMESTAMP>,
        "aud": "<CLIENT ID"
    }
    Should be signed with CLIENT_SECRET
    """
    def has_permission(self, request, view):
        if getattr(settings, 'DISABLE_TOKEN_CHECK', False):
            return True
        token = request.headers.get('x-annotator-auth-token', '')
        if not token:
            logger.debug("No token found in headers")
            return False
        try:
            # TODO: Determine how and if we could remove `jwt.decode` from being called directly from this
            #   service. Instead, use `jwt_decode_handler` or other library code that is used in other services.
            #   It would be useful to simplify authentication within the platform, especially during upgrades of
            #   authentication related dependencies.
            data = jwt.decode(
                token,
                settings.CLIENT_SECRET,
                algorithms=[api_settings.JWT_ALGORITHM],
                audience=settings.CLIENT_ID
            )
            auth_user = data['sub']
            user_found = False
            for request_field in ('GET', 'POST', 'data'):
                if 'user' in getattr(request, request_field):
                    req_user = getattr(request, request_field)['user']
                    if req_user == auth_user:
                        user_found = True
                        # but we do not break or return here,
                        # because `user` may be present in more than one field (GET, POST)
                        # and we must make sure that all of them are correct
                    else:
                        logger.debug("Token user %s did not match %s user %s", auth_user, request_field, req_user)
                        return False
            if user_found:
                return True
            else:
                logger.info("No user was present to compare in GET, POST or DATA")
        except jwt.ExpiredSignatureError:
            logger.debug("Token was expired: %s", token)
        except jwt.DecodeError:
            logger.debug("Could not decode token %s", token)
        except jwt.InvalidAudienceError:
            logger.debug("Token has wrong issuer %s", token)
        return False
