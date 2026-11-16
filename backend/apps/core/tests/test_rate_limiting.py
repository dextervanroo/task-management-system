import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle

from apps.users.tests.factories import DEFAULT_PASSWORD

pytestmark = pytest.mark.django_db


@pytest.fixture
def throttle_rates(monkeypatch):
    """Lower the configured rates so tests do not need hundreds of requests."""

    def set_rate(scope, rate):
        monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, scope, rate)

    return set_rate


def test_configured_rates():
    rates = api_settings.DEFAULT_THROTTLE_RATES

    assert rates == {"anon": "50/minute", "user": "1000/minute", "login": "5/minute"}


def test_global_throttles_are_enabled():
    names = [throttle.__name__ for throttle in api_settings.DEFAULT_THROTTLE_CLASSES]

    assert names == ["AnonRateThrottle", "UserRateThrottle"]


def test_login_is_limited_to_five_attempts_per_minute(api_client, user):
    url = reverse("auth-login")
    payload = {"username": "alice", "password": "wrong"}

    statuses = [api_client.post(url, payload).status_code for _ in range(6)]

    assert statuses == [401] * 5 + [429]


def test_login_throttle_also_blocks_valid_credentials(api_client, user):
    url = reverse("auth-login")
    for _ in range(5):
        api_client.post(url, {"username": "alice", "password": "wrong"})

    response = api_client.post(url, {"username": "alice", "password": DEFAULT_PASSWORD})

    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Retry-After" in response.headers


def test_login_throttle_is_per_client_ip(api_client, user):
    url = reverse("auth-login")
    payload = {"username": "alice", "password": "wrong"}
    for _ in range(5):
        api_client.post(url, payload, REMOTE_ADDR="10.0.0.1")

    response = api_client.post(url, payload, REMOTE_ADDR="10.0.0.2")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_anonymous_requests_are_throttled(api_client, throttle_rates):
    throttle_rates("anon", "3/minute")
    url = reverse("auth-refresh")

    statuses = [api_client.post(url, {"refresh": "x"}).status_code for _ in range(4)]

    assert statuses == [401, 401, 401, 429]


def test_authenticated_requests_are_throttled_per_user(auth_client, other_client, throttle_rates):
    throttle_rates("user", "2/minute")
    url = reverse("user-me")

    statuses = [auth_client.get(url).status_code for _ in range(3)]

    assert statuses == [200, 200, 429]
    assert other_client.get(url).status_code == status.HTTP_200_OK
