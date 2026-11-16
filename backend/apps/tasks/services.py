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


def _notify_assignee(task: Task) -> None:
    """Email the assignee in the background once the transaction commits."""
    from apps.tasks.tasks import send_task_assigned_email

    task_id = str(task.pk)
    transaction.on_commit(lambda: send_task_assigned_email.delay(task_id))


@transaction.atomic
def create_task(*, created_by, **fields) -> Task:
    task = Task(created_by=created_by, **fields)
    _sync_completion(task)
    task.save()
    if task.assignee_id:
        _notify_assignee(task)
    return task


@transaction.atomic
def update_task(task: Task, **fields) -> Task:
    previous_assignee_id = task.assignee_id
    for name, value in fields.items():
        setattr(task, name, value)
    _sync_completion(task)
    task.save()
    if task.assignee_id and task.assignee_id != previous_assignee_id:
        _notify_assignee(task)
    return task


def delete_task(task: Task) -> None:
    task.delete()


def complete_task(task: Task) -> Task:
    """Mark the task as completed. Completing an already completed task is a no-op."""
    if task.status == Task.Status.COMPLETED:
        return task
    return update_task(task, status=Task.Status.COMPLETED)
