import pytest
from django.urls import reverse

from apps.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_user_changelist_renders_for_staff(admin_client):
    UserFactory.create_batch(3)

    response = admin_client.get(reverse("admin:users_user_changelist"))

    assert response.status_code == 200


def test_user_changelist_search(admin_client):
    UserFactory(username="findme")

    response = admin_client.get(reverse("admin:users_user_changelist"), {"q": "findme"})

    assert response.status_code == 200
    assert b"findme" in response.content


def test_user_change_page_renders(admin_client):
    user = UserFactory()

    response = admin_client.get(reverse("admin:users_user_change", args=[user.pk]))

    assert response.status_code == 200
