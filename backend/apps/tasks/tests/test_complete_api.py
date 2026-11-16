from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.tasks import services
from apps.tasks.models import Task
from apps.tasks.tests.factories import TaskFactory

pytestmark = pytest.mark.django_db


def complete_url(task):
    return reverse("task-complete", args=[task.pk])


def test_complete_task_service_sets_status_and_time(user):
    task = TaskFactory(created_by=user, status=Task.Status.IN_PROGRESS)

    services.complete_task(task)

    task.refresh_from_db()
    assert task.status == Task.Status.COMPLETED
    assert task.completed_at is not None


def test_creator_can_complete(auth_client, user):
    task = TaskFactory(created_by=user)

    response = auth_client.post(complete_url(task))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "completed"
    assert response.json()["completedAt"] is not None
    assert response.json()["isOverdue"] is False


def test_assignee_can_complete(other_client, user, other_user):
    task = TaskFactory(created_by=user, assignee=other_user)

    assert other_client.post(complete_url(task)).status_code == status.HTTP_200_OK


def test_completing_twice_keeps_first_completion_time(auth_client, user):
    first = timezone.now() - timedelta(hours=3)
    task = TaskFactory(created_by=user, status=Task.Status.COMPLETED, completed_at=first)

    response = auth_client.post(complete_url(task))

    assert response.status_code == status.HTTP_200_OK
    task.refresh_from_db()
    assert task.completed_at == first


def test_outsider_cannot_complete(other_client, user):
    task = TaskFactory(created_by=user)

    assert other_client.post(complete_url(task)).status_code == status.HTTP_404_NOT_FOUND


def test_anonymous_cannot_complete(api_client, user):
    task = TaskFactory(created_by=user)

    assert api_client.post(complete_url(task)).status_code == status.HTTP_401_UNAUTHORIZED


def test_complete_only_accepts_post(auth_client, user):
    task = TaskFactory(created_by=user)

    assert auth_client.get(complete_url(task)).status_code == status.HTTP_405_METHOD_NOT_ALLOWED
