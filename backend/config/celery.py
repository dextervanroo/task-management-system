"""Celery application. Workers start with ``celery -A config worker``."""

from celery import Celery

from config.settings import configure_settings_module

configure_settings_module()

app = Celery("task_management")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
