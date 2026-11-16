import pytest
from django.urls import reverse
from rest_framework import status

from apps.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

USERS = reverse("user-list")
ME = reverse("user-me")


def test_list_requires_authentication(api_client):
    assert api_client.get(USERS).status_code == status.HTTP_401_UNAUTHORIZED


def test_list_returns_active_users_in_camel_case(auth_client, user):
    UserFactory(username="carol", first_name="Carol", last_name="Jones")
    UserFactory(username="inactive", is_active=False)

    response = auth_client.get(USERS)

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["count"] == 2
    usernames = [item["username"] for item in body["results"]]
    assert usernames == ["alice", "carol"]
    carol = body["results"][1]
    assert set(carol) == {"id", "username", "email", "firstName", "lastName", "fullName"}
    assert carol["fullName"] == "Carol Jones"


def test_list_does_not_expose_sensitive_fields(auth_client, user):
    item = auth_client.get(USERS).json()["results"][0]

    assert "password" not in item
    assert "isSuperuser" not in item


def test_list_supports_search(auth_client, user):
    UserFactory(username="carol")

    response = auth_client.get(USERS, {"search": "car"})

    assert [item["username"] for item in response.json()["results"]] == ["carol"]


def test_list_query_count_is_constant(auth_client, user, django_assert_num_queries):
    UserFactory.create_batch(5)

    with django_assert_num_queries(3):  # auth user + count + page
        auth_client.get(USERS)


def test_retrieve_user(auth_client, other_user):
    response = auth_client.get(reverse("user-detail", args=[other_user.pk]))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == str(other_user.pk)


def test_users_are_read_only(auth_client, other_user):
    detail = reverse("user-detail", args=[other_user.pk])

    assert auth_client.post(USERS, {"username": "x"}).status_code == 405
    assert auth_client.patch(detail, {"username": "x"}).status_code == 405
    assert auth_client.delete(detail).status_code == 405


def test_me_returns_current_user(auth_client, user):
    response = auth_client.get(ME)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["username"] == "alice"
    assert response.json()["isStaff"] is False


def test_me_requires_authentication(api_client):
    assert api_client.get(ME).status_code == status.HTTP_401_UNAUTHORIZED
