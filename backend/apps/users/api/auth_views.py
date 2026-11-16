from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from apps.core.api.throttling import LoginRateThrottle


class LoginView(TokenObtainPairView):
    """Exchange a username and password for an access/refresh token pair."""

    throttle_classes = [AnonRateThrottle, LoginRateThrottle]


class RefreshView(TokenRefreshView):
    """Exchange a refresh token for a new pair; the old refresh token is blacklisted."""


class LogoutView(TokenBlacklistView):
    """Blacklist a refresh token so it can no longer be used."""
