from datetime import timedelta

import pytest
from django.utils import timezone

from apps.tasks import services
from apps.tasks.models import Task
from apps.tasks.tests.factories import TaskFactory

pytestmark = pytest.mark.django_db


def test_create_task_sets_creator(user, other_user):
    task = services.create_task(created_by=user, title="Plan", assignee=other_user)

    assert task.pk is not None
    assert task.created_by == user
    assert task.assignee == other_user
    assert task.status == Task.Status.PENDING


def test_create_completed_task_sets_completion_time(user):
    task = services.create_task(created_by=user, title="Done", status=Task.Status.COMPLETED)

    assert task.completed_at is not None


def test_update_task_changes_fields(user):
    task = TaskFactory(created_by=user, title="Old")

    services.update_task(task, title="New", priority=Task.Priority.HIGH)

    task.refresh_from_db()
    assert (task.title, task.priority) == ("New", Task.Priority.HIGH)


def test_update_to_completed_sets_completion_time(user):
    task = TaskFactory(created_by=user)

    services.update_task(task, status=Task.Status.COMPLETED)

    task.refresh_from_db()
    assert task.completed_at is not None


def test_reopening_task_clears_completion_time(user):
    task = TaskFactory(created_by=user, status=Task.Status.COMPLETED, completed_at=timezone.now())

    services.update_task(task, status=Task.Status.IN_PROGRESS)

    task.refresh_from_db()
    assert task.completed_at is None


def test_updating_completed_task_keeps_original_completion_time(user):
    completed_at = timezone.now() - timedelta(days=2)
    task = TaskFactory(created_by=user, status=Task.Status.COMPLETED, completed_at=completed_at)

    services.update_task(task, title="Renamed")

    task.refresh_from_db()
    assert task.completed_at == completed_at


def test_delete_task(user):
    task = TaskFactory(created_by=user)

    services.delete_task(task)

    assert not Task.objects.filter(pk=task.pk).exists()
