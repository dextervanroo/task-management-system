"""Project-wide pytest fixtures."""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.tests.factories import StaffUserFactory, UserFactory


@pytest.fixture
def api_client() -> APIClient:
    """An unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory(username="alice", first_name="Alice", last_name="Anderson")


@pytest.fixture
def other_user(db):
    return UserFactory(username="bob", first_name="Bob", last_name="Brown")


@pytest.fixture
def staff_user(db):
    return StaffUserFactory(username="admin", first_name="Ada", last_name="Admin")


@pytest.fixture
def auth_client(user) -> APIClient:
    """A client authenticated as ``user`` with a real JWT access token."""
    return make_authenticated_client(user)


@pytest.fixture
def other_client(other_user) -> APIClient:
    return make_authenticated_client(other_user)


@pytest.fixture
def staff_client(staff_user) -> APIClient:
    return make_authenticated_client(staff_user)


def make_authenticated_client(user) -> APIClient:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}")
    return client


@pytest.fixture(autouse=True)
def clear_cache():
    """Throttling state lives in the cache; isolate it between tests."""
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()
