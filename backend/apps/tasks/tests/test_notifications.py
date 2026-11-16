from datetime import timedelta

import pytest
from django.utils import timezone

from apps.tasks import notifications
from apps.tasks.models import Task
from apps.tasks.tests.factories import TaskFactory
from apps.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

YESTERDAY = timezone.localdate() - timedelta(days=1)


def test_assignment_message(user, other_user):
    task = TaskFactory(title="Ship it", created_by=user, assignee=other_user, due_date=YESTERDAY)

    message = notifications.build_assignment_message(task)

    assert message.to == ["bob@example.com"]
    assert message.subject == "New task assigned to you: Ship it"
    assert "Alice Anderson assigned you the task" in message.body
    assert str(YESTERDAY) in message.body


def test_assignment_message_without_due_date(user, other_user):
    task = TaskFactory(created_by=user, assignee=other_user, due_date=None)

    assert "Due date: none" in notifications.build_assignment_message(task).body


def test_no_assignment_message_without_assignee_email(user):
    task = TaskFactory(created_by=user, assignee=UserFactory(email=""))

    assert notifications.build_assignment_message(task) is None


def test_no_assignment_message_for_unassigned_task(user):
    assert notifications.build_assignment_message(TaskFactory(created_by=user)) is None


def test_overdue_reminders_group_tasks_by_recipient(user, other_user):
    TaskFactory(title="A", created_by=user, assignee=other_user, due_date=YESTERDAY)
    TaskFactory(title="B", created_by=other_user, assignee=other_user, due_date=YESTERDAY)
    TaskFactory(title="C", created_by=user, due_date=YESTERDAY)  # unassigned -> creator
    TaskFactory(title="D", created_by=user, assignee=other_user)  # not overdue
    TaskFactory(
        title="E",
        created_by=user,
        assignee=other_user,
        due_date=YESTERDAY,
        status=Task.Status.COMPLETED,
        completed_at=timezone.now(),
    )

    messages = {m.to[0]: m for m in notifications.build_overdue_reminders()}

    assert set(messages) == {"alice@example.com", "bob@example.com"}
    assert messages["bob@example.com"].subject == "You have 2 overdue tasks"
    assert "- A (due " in messages["bob@example.com"].body
    assert "- B (due " in messages["bob@example.com"].body
    assert messages["alice@example.com"].subject == "You have 1 overdue task"


def test_overdue_reminders_skip_users_without_email(user):
    TaskFactory(created_by=user, assignee=UserFactory(email=""), due_date=YESTERDAY)

    assert notifications.build_overdue_reminders() == []
