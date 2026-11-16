from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.tasks.models import Task
from apps.tasks.tests.factories import TaskFactory
from apps.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

TASKS = reverse("task-list")


def detail(task):
    return reverse("task-detail", args=[task.pk])


# --- create -----------------------------------------------------------------


def test_create_task(auth_client, user, other_user):
    payload = {
        "title": "Write report",
        "description": "Quarterly numbers",
        "priority": "high",
        "dueDate": str(timezone.localdate() + timedelta(days=3)),
        "assignee": str(other_user.pk),
    }

    response = auth_client.post(TASKS, payload)

    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["title"] == "Write report"
    assert body["status"] == "pending"
    assert body["priority"] == "high"
    assert body["dueDate"] == payload["dueDate"]
    assert body["assignee"] == str(other_user.pk)
    assert body["assigneeDetail"]["username"] == "bob"
    assert body["createdBy"]["username"] == "alice"
    assert body["completedAt"] is None
    assert body["isOverdue"] is False
    assert Task.objects.get(pk=body["id"]).created_by == user


def test_create_task_with_only_title(auth_client):
    response = auth_client.post(TASKS, {"title": "Minimal"})

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["assignee"] is None
    assert response.json()["assigneeDetail"] is None


def test_create_ignores_read_only_fields(auth_client, user, other_user):
    response = auth_client.post(
        TASKS,
        {"title": "Sneaky", "createdBy": str(other_user.pk), "completedAt": "2020-01-01T00:00:00Z"},
    )

    task = Task.objects.get(pk=response.json()["id"])
    assert task.created_by == user
    assert task.completed_at is None


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({}, "title"),
        ({"title": ""}, "title"),
        ({"title": "x" * 201}, "title"),
        ({"title": "T", "status": "archived"}, "status"),
        ({"title": "T", "priority": "urgent"}, "priority"),
        ({"title": "T", "dueDate": "not-a-date"}, "dueDate"),
        ({"title": "T", "assignee": "00000000-0000-0000-0000-000000000000"}, "assignee"),
    ],
)
def test_create_validation_errors(auth_client, payload, field):
    response = auth_client.post(TASKS, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert field in response.json()


def test_create_rejects_past_due_date(auth_client):
    yesterday = timezone.localdate() - timedelta(days=1)

    response = auth_client.post(TASKS, {"title": "Late", "dueDate": str(yesterday)})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["dueDate"] == ["Due date cannot be in the past."]


def test_create_rejects_inactive_assignee(auth_client):
    inactive = UserFactory(is_active=False)

    response = auth_client.post(TASKS, {"title": "T", "assignee": str(inactive.pk)})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "assignee" in response.json()


# --- list / retrieve --------------------------------------------------------


def test_list_returns_only_visible_tasks(auth_client, user, other_user):
    mine = TaskFactory(created_by=user)
    assigned = TaskFactory(created_by=other_user, assignee=user)
    TaskFactory(created_by=other_user)

    response = auth_client.get(TASKS)

    assert response.status_code == status.HTTP_200_OK
    assert {item["id"] for item in response.json()["results"]} == {
        str(mine.pk),
        str(assigned.pk),
    }


def test_staff_lists_every_task(staff_client, user, other_user):
    TaskFactory(created_by=user)
    TaskFactory(created_by=other_user)

    assert staff_client.get(TASKS).json()["count"] == 2


def test_list_is_paginated(auth_client, user):
    TaskFactory.create_batch(12, created_by=user)

    first = auth_client.get(TASKS).json()
    second = auth_client.get(TASKS, {"page": 2}).json()

    assert (first["count"], first["totalPages"], len(first["results"])) == (12, 2, 10)
    assert len(second["results"]) == 2


def test_list_query_count_does_not_grow_with_rows(auth_client, user, django_assert_num_queries):
    TaskFactory.create_batch(3, created_by=user, assignee=UserFactory())
    with django_assert_num_queries(3):  # auth user + count + page with JOINs
        auth_client.get(TASKS)

    TaskFactory.create_batch(7, created_by=user, assignee=UserFactory())
    with django_assert_num_queries(3):
        auth_client.get(TASKS)


def test_retrieve_visible_task(auth_client, user):
    task = TaskFactory(created_by=user)

    response = auth_client.get(detail(task))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == str(task.pk)


def test_overdue_flag_in_response(auth_client, user):
    task = TaskFactory(created_by=user, due_date=timezone.localdate() - timedelta(days=1))

    assert auth_client.get(detail(task)).json()["isOverdue"] is True


# --- update -----------------------------------------------------------------


def test_creator_can_update(auth_client, user):
    task = TaskFactory(created_by=user)

    response = auth_client.patch(detail(task), {"title": "Renamed", "status": "in_progress"})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["title"] == "Renamed"
    assert response.json()["status"] == "in_progress"


def test_assignee_can_update(other_client, user, other_user):
    task = TaskFactory(created_by=user, assignee=other_user)

    response = other_client.patch(detail(task), {"status": "in_progress"})

    assert response.status_code == status.HTTP_200_OK


def test_full_update(auth_client, user, other_user):
    task = TaskFactory(created_by=user)
    payload = {"title": "Full", "description": "", "status": "pending", "priority": "low"}

    response = auth_client.put(detail(task), {**payload, "assignee": str(other_user.pk)})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["assigneeDetail"]["username"] == "bob"


def test_update_to_completed_sets_completed_at(auth_client, user):
    task = TaskFactory(created_by=user)

    response = auth_client.patch(detail(task), {"status": "completed"})

    assert response.json()["completedAt"] is not None


def test_update_can_unassign(auth_client, user, other_user):
    task = TaskFactory(created_by=user, assignee=other_user)

    response = auth_client.patch(detail(task), {"assignee": None})

    assert response.json()["assignee"] is None


def test_update_keeps_existing_past_due_date(auth_client, user):
    past = timezone.localdate() - timedelta(days=5)
    task = TaskFactory(created_by=user, due_date=past)

    response = auth_client.patch(detail(task), {"title": "Still late", "dueDate": str(past)})

    assert response.status_code == status.HTTP_200_OK


def test_update_rejects_moving_due_date_to_past(auth_client, user):
    task = TaskFactory(created_by=user)
    past = timezone.localdate() - timedelta(days=1)

    response = auth_client.patch(detail(task), {"dueDate": str(past)})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


# --- delete -----------------------------------------------------------------


def test_creator_can_delete(auth_client, user):
    task = TaskFactory(created_by=user)

    assert auth_client.delete(detail(task)).status_code == status.HTTP_204_NO_CONTENT
    assert not Task.objects.filter(pk=task.pk).exists()


def test_assignee_cannot_delete(other_client, user, other_user):
    task = TaskFactory(created_by=user, assignee=other_user)

    response = other_client.delete(detail(task))

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Task.objects.filter(pk=task.pk).exists()


def test_staff_can_delete_any_task(staff_client, user):
    task = TaskFactory(created_by=user)

    assert staff_client.delete(detail(task)).status_code == status.HTTP_204_NO_CONTENT
