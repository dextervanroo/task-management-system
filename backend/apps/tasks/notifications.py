"""Builds the emails sent about tasks. Sending is done by the Celery jobs."""

from collections import defaultdict

from django.conf import settings
from django.core.mail import EmailMessage

from apps.tasks.models import Task
from apps.tasks.selectors import overdue_tasks


def build_assignment_message(task: Task) -> EmailMessage | None:
    """Email telling the assignee about a task, or None if nobody can receive it."""
    if task.assignee is None or not task.assignee.email:
        return None
    body = (
        f"Hi {task.assignee},\n\n"
        f'{task.created_by} assigned you the task "{task.title}".\n\n'
        f"Priority: {task.get_priority_display()}\n"
        f"Due date: {task.due_date or 'none'}\n\n"
        f"{task.description}".rstrip()
    )
    return EmailMessage(
        subject=f"New task assigned to you: {task.title}",
        body=body + "\n",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[task.assignee.email],
    )


def build_overdue_reminders() -> list[EmailMessage]:
    """One email per user listing their overdue tasks.

    A task belongs to its assignee, or to its creator while it is unassigned.
    """
    tasks_by_recipient = defaultdict(list)
    for task in overdue_tasks().select_related("assignee", "created_by").order_by("due_date"):
        recipient = task.assignee or task.created_by
        if recipient.email:
            tasks_by_recipient[recipient].append(task)

    messages = []
    for recipient, tasks in tasks_by_recipient.items():
        count = len(tasks)
        lines = "\n".join(f"- {task.title} (due {task.due_date})" for task in tasks)
        messages.append(
            EmailMessage(
                subject=f"You have {count} overdue task{'s' if count != 1 else ''}",
                body=f"Hi {recipient},\n\nThese tasks are past their due date:\n\n{lines}\n",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient.email],
            )
        )
    return messages
