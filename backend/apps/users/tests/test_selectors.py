import pytest

from apps.users.selectors import list_active_users
from apps.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_list_active_users_excludes_inactive_and_orders_by_username():
    UserFactory(username="zed")
    UserFactory(username="amy")
    UserFactory(username="old", is_active=False)

    assert [user.username for user in list_active_users()] == ["amy", "zed"]
