from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.tasks.models import Task
from apps.tasks.tests.factories import TaskFactory

pytestmark = pytest.mark.django_db

TASKS = reverse("task-list")
TODAY = timezone.localdate()


def titles(client, **params):
    response = client.get(TASKS, params)
    assert response.status_code == status.HTTP_200_OK, response.json()
    return sorted(item["title"] for item in response.json()["results"])


@pytest.fixture
def tasks(user, other_user):
    now = timezone.now()
    return {
        "late": TaskFactory(created_by=user, title="late", due_date=TODAY - timedelta(days=2)),
        "today": TaskFactory(
            created_by=user, title="today", due_date=TODAY, status=Task.Status.IN_PROGRESS
        ),
        "soon": TaskFactory(
            created_by=user, title="soon", due_date=TODAY + timedelta(days=3), assignee=other_user
        ),
        "done": TaskFactory(
            created_by=user,
            title="done",
            due_date=TODAY - timedelta(days=1),
            status=Task.Status.COMPLETED,
            completed_at=now,
        ),
        "undated": TaskFactory(created_by=user, title="undated", priority=Task.Priority.HIGH),
    }


def test_filter_by_status(auth_client, tasks):
    assert titles(auth_client, status="completed") == ["done"]
    assert titles(auth_client, status="in_progress") == ["today"]


def test_filter_by_several_statuses(auth_client, tasks):
    assert titles(auth_client, status="completed,in_progress") == ["done", "today"]


def test_filter_by_exact_due_date(auth_client, tasks):
    assert titles(auth_client, due_date=str(TODAY)) == ["today"]


def test_filter_by_due_date_range(auth_client, tasks):
    params = {"due_date_after": str(TODAY - timedelta(days=1)), "due_date_before": str(TODAY)}

    assert titles(auth_client, **params) == ["done", "today"]


def test_filter_by_open_ended_due_date_range(auth_client, tasks):
    assert titles(auth_client, due_date_after=str(TODAY)) == ["soon", "today"]
    assert titles(auth_client, due_date_before=str(TODAY - timedelta(days=1))) == ["done", "late"]


def test_filter_overdue(auth_client, tasks):
    assert titles(auth_client, overdue="true") == ["late"]
    assert titles(auth_client, overdue="false") == ["done", "soon", "today", "undated"]


def test_filter_by_priority_and_assignee(auth_client, tasks, other_user):
    assert titles(auth_client, priority="high") == ["undated"]
    assert titles(auth_client, assignee=str(other_user.pk)) == ["soon"]


def test_search_by_title(auth_client, tasks):
    assert titles(auth_client, search="tod") == ["today"]


def test_filters_combine(auth_client, tasks):
    assert titles(auth_client, status="pending", due_date_before=str(TODAY)) == ["late"]


def test_filters_never_leak_other_users_tasks(auth_client, other_user, tasks):
    TaskFactory(
        created_by=other_user,
        title="hidden",
        status=Task.Status.COMPLETED,
        completed_at=timezone.now(),
    )

    assert titles(auth_client, status="completed") == ["done"]


@pytest.mark.parametrize(
    ("ordering", "expected"),
    [
        ("due_date", ["late", "done", "today", "soon", "undated"]),
        ("-due_date", ["undated", "soon", "today", "done", "late"]),
        ("title", ["done", "late", "soon", "today", "undated"]),
    ],
)
def test_ordering(auth_client, tasks, ordering, expected):
    response = auth_client.get(TASKS, {"ordering": ordering})

    assert [item["title"] for item in response.json()["results"]] == expected


@pytest.mark.parametrize(
    "params",
    [{"status": "archived"}, {"due_date": "yesterday"}, {"due_date_after": "2026-13-01"}],
)
def test_invalid_filter_values_return_400(auth_client, params):
    assert auth_client.get(TASKS, params).status_code == status.HTTP_400_BAD_REQUEST
