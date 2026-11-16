from datetime import timedelta

import pytest
from celery.schedules import crontab
from django.conf import settings
from django.utils import timezone

from apps.tasks import services
from apps.tasks.tasks import send_overdue_task_reminders, send_task_assigned_email
from apps.tasks.tests.factories import TaskFactory
from config.celery import app

pytestmark = pytest.mark.django_db


def test_celery_app_uses_django_settings():
    assert app.main == "task_management"
    assert app.conf.broker_url == settings.CELERY_BROKER_URL


def test_overdue_reminder_runs_daily():
    entry = settings.CELERY_BEAT_SCHEDULE["send-overdue-task-reminders"]

    assert entry["task"] == "apps.tasks.tasks.send_overdue_task_reminders"
    assert entry["schedule"] == crontab(hour=8, minute=0)


def test_assignment_job_sends_email(mailoutbox, user, other_user):
    task = TaskFactory(created_by=user, assignee=other_user)

    send_task_assigned_email.delay(str(task.pk))

    assert [message.to for message in mailoutbox] == [["bob@example.com"]]


def test_assignment_job_ignores_deleted_task(mailoutbox):
    send_task_assigned_email.delay("00000000-0000-0000-0000-000000000000")

    assert mailoutbox == []


def test_overdue_job_sends_one_email_per_recipient(mailoutbox, user, other_user):
    yesterday = timezone.localdate() - timedelta(days=1)
    TaskFactory.create_batch(2, created_by=user, assignee=other_user, due_date=yesterday)

    sent = send_overdue_task_reminders.delay().get()

    assert sent == 1
    assert len(mailoutbox) == 1


def test_creating_assigned_task_queues_notification(
    mailoutbox, django_capture_on_commit_callbacks, user, other_user
):
    with django_capture_on_commit_callbacks(execute=True):
        services.create_task(created_by=user, title="New", assignee=other_user)

    assert len(mailoutbox) == 1


def test_creating_unassigned_task_sends_nothing(
    mailoutbox, django_capture_on_commit_callbacks, user
):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        services.create_task(created_by=user, title="New")

    assert callbacks == []
    assert mailoutbox == []


def test_reassigning_task_queues_notification(
    mailoutbox, django_capture_on_commit_callbacks, user, other_user
):
    task = TaskFactory(created_by=user, assignee=user)

    with django_capture_on_commit_callbacks(execute=True):
        services.update_task(task, assignee=other_user)

    assert [message.to for message in mailoutbox] == [["bob@example.com"]]


def test_update_without_new_assignee_sends_nothing(
    django_capture_on_commit_callbacks, user, other_user
):
    task = TaskFactory(created_by=user, assignee=other_user)

    with django_capture_on_commit_callbacks() as callbacks:
        services.update_task(task, title="Renamed", assignee=other_user)
        services.update_task(task, assignee=None)

    assert callbacks == []


def test_overdue_job_without_overdue_tasks_sends_nothing(mailoutbox, user):
    TaskFactory(created_by=user)

    assert send_overdue_task_reminders.delay().get() == 0
    assert mailoutbox == []
