import uuid
from datetime import timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone

from apps.tasks.models import Task
from apps.tasks.tests.factories import TaskFactory

pytestmark = pytest.mark.django_db


def test_task_defaults():
    task = TaskFactory()

    assert isinstance(task.pk, uuid.UUID)
    assert task.status == Task.Status.PENDING
    assert task.priority == Task.Priority.MEDIUM
    assert task.assignee is None
    assert task.due_date is None
    assert task.completed_at is None


def test_task_str_is_title():
    assert str(TaskFactory(title="Write docs")) == "Write docs"


def test_tasks_are_ordered_newest_first():
    older = TaskFactory()
    newer = TaskFactory()

    assert list(Task.objects.all()) == [newer, older]


@pytest.mark.parametrize(
    ("days_from_today", "status", "expected"),
    [
        (-1, Task.Status.PENDING, True),
        (-1, Task.Status.IN_PROGRESS, True),
        (-1, Task.Status.COMPLETED, False),
        (0, Task.Status.PENDING, False),
        (1, Task.Status.PENDING, False),
    ],
)
def test_is_overdue(days_from_today, status, expected):
    completed_at = timezone.now() if status == Task.Status.COMPLETED else None
    task = TaskFactory(
        due_date=timezone.localdate() + timedelta(days=days_from_today),
        status=status,
        completed_at=completed_at,
    )

    assert task.is_overdue is expected


def test_task_without_due_date_is_never_overdue():
    assert TaskFactory(due_date=None).is_overdue is False


def test_completed_task_requires_completion_time():
    with pytest.raises(IntegrityError):
        TaskFactory(status=Task.Status.COMPLETED, completed_at=None)


def test_open_task_cannot_have_completion_time():
    with pytest.raises(IntegrityError):
        TaskFactory(status=Task.Status.PENDING, completed_at=timezone.now())


def test_deleting_assignee_keeps_task():
    task = TaskFactory(assignee=TaskFactory().created_by)

    task.assignee.delete()
    task.refresh_from_db()

    assert task.assignee is None


def test_declared_indexes():
    index_fields = {tuple(index.fields) for index in Task._meta.indexes}

    assert {("status",), ("due_date",), ("assignee", "status")} <= index_fields
