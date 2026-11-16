"""Celery jobs for tasks."""

from celery import shared_task
from django.core import mail

from apps.tasks import notifications
from apps.tasks.models import Task


@shared_task
def send_task_assigned_email(task_id: str) -> bool:
    """Tell the assignee about a task. Returns whether an email was sent."""
    task = Task.objects.select_related("assignee", "created_by").filter(pk=task_id).first()
    message = notifications.build_assignment_message(task) if task else None
    if message is None:
        return False
    message.send()
    return True


@shared_task
def send_overdue_task_reminders() -> int:
    """Daily digest of overdue tasks. Returns the number of emails sent."""
    messages = notifications.build_overdue_reminders()
    if not messages:
        return 0
    with mail.get_connection() as connection:
        return connection.send_messages(messages)
