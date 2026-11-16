"""Business rules for changing tasks. Independent from the HTTP layer."""

from django.db import transaction
from django.utils import timezone

from apps.tasks.models import Task


def _sync_completion(task: Task) -> None:
    """Keep ``completed_at`` consistent with the status."""
    if task.status == Task.Status.COMPLETED:
        task.completed_at = task.completed_at or timezone.now()
    else:
        task.completed_at = None


@transaction.atomic
def create_task(*, created_by, **fields) -> Task:
    task = Task(created_by=created_by, **fields)
    _sync_completion(task)
    task.save()
    return task


@transaction.atomic
def update_task(task: Task, **fields) -> Task:
    for name, value in fields.items():
        setattr(task, name, value)
    _sync_completion(task)
    task.save()
    return task


def delete_task(task: Task) -> None:
    task.delete()
