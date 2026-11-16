import pytest
from django.urls import reverse
from rest_framework import status

from apps.users.tests.factories import DEFAULT_PASSWORD, UserFactory

pytestmark = pytest.mark.django_db

LOGIN = reverse("auth-login")
REFRESH = reverse("auth-refresh")
LOGOUT = reverse("auth-logout")


def login(api_client, username="alice", password=DEFAULT_PASSWORD):
    return api_client.post(LOGIN, {"username": username, "password": password})


def test_login_returns_token_pair(api_client, user):
    response = login(api_client)

    assert response.status_code == status.HTTP_200_OK
    assert set(response.json()) == {"access", "refresh"}


def test_login_records_last_login(api_client, user):
    login(api_client)

    user.refresh_from_db()
    assert user.last_login is not None


@pytest.mark.parametrize(
    ("username", "password"),
    [("alice", "wrong-password"), ("nobody", DEFAULT_PASSWORD)],
)
def test_login_rejects_bad_credentials(api_client, user, username, password):
    response = login(api_client, username, password)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "access" not in response.json()


def test_login_rejects_inactive_user(api_client):
    UserFactory(username="ghost", is_active=False)

    assert login(api_client, "ghost").status_code == status.HTTP_401_UNAUTHORIZED


def test_login_requires_both_fields(api_client):
    response = api_client.post(LOGIN, {"username": "alice"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.json()


def test_refresh_rotates_and_blacklists_old_token(api_client, user):
    old_refresh = login(api_client).json()["refresh"]

    response = api_client.post(REFRESH, {"refresh": old_refresh})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["refresh"] != old_refresh
    reused = api_client.post(REFRESH, {"refresh": old_refresh})
    assert reused.status_code == status.HTTP_401_UNAUTHORIZED


def test_refresh_rejects_garbage(api_client):
    response = api_client.post(REFRESH, {"refresh": "not-a-token"})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_logout_invalidates_refresh_token(api_client, user):
    refresh = login(api_client).json()["refresh"]

    response = api_client.post(LOGOUT, {"refresh": refresh})

    assert response.status_code == status.HTTP_200_OK
    assert api_client.post(REFRESH, {"refresh": refresh}).status_code == 401
