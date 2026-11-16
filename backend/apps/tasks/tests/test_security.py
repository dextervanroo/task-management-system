"""Access from outside: anonymous clients and users that do not own the task."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.tasks.tests.factories import TaskFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def foreign_task(other_user):
    return TaskFactory(created_by=other_user)


@pytest.mark.parametrize("method", ["get", "post"])
def test_anonymous_cannot_access_collection(api_client, method):
    response = getattr(api_client, method)(reverse("task-list"))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("method", ["get", "put", "patch", "delete"])
def test_anonymous_cannot_access_task(api_client, foreign_task, method):
    response = getattr(api_client, method)(reverse("task-detail", args=[foreign_task.pk]))

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("method", ["get", "put", "patch", "delete"])
def test_other_users_task_is_hidden(auth_client, foreign_task, method):
    response = getattr(auth_client, method)(
        reverse("task-detail", args=[foreign_task.pk]), {"title": "Hijacked"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    foreign_task.refresh_from_db()
    assert foreign_task.title != "Hijacked"


@pytest.mark.parametrize(
    "header",
    ["Bearer invalid.token.value", "Basic YWxpY2U6cGFzcw==", "Bearer"],
)
def test_invalid_credentials_are_rejected(api_client, header):
    api_client.credentials(HTTP_AUTHORIZATION=header)

    assert api_client.get(reverse("task-list")).status_code == status.HTTP_401_UNAUTHORIZED


def test_refresh_token_cannot_be_used_as_access_token(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user)}")

    assert api_client.get(reverse("task-list")).status_code == status.HTTP_401_UNAUTHORIZED


def test_inactive_user_token_is_rejected(auth_client, user):
    user.is_active = False
    user.save()

    assert auth_client.get(reverse("task-list")).status_code == status.HTTP_401_UNAUTHORIZED


def test_invalid_uuid_in_url_returns_404(auth_client):
    response = auth_client.get("/api/tasks/not-a-uuid/")

    assert response.status_code == status.HTTP_404_NOT_FOUND
