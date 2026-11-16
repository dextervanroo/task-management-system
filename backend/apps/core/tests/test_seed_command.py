from io import StringIO

import pytest
from django.contrib.auth import authenticate, get_user_model
from django.core.management import call_command

from apps.tasks.models import Task

pytestmark = pytest.mark.django_db

User = get_user_model()


def seed(*args):
    out = StringIO()
    call_command("seed", *args, stdout=out)
    return out.getvalue()


def test_seed_creates_demo_credentials():
    seed()

    assert authenticate(username="admin", password="admin123").is_staff
    assert authenticate(username="alice", password="demo1234") is not None
    assert authenticate(username="bob", password="demo1234") is not None
    assert not User.objects.get(username="alice").is_staff


def test_seed_creates_sample_tasks_for_each_user():
    seed()

    for username in ("admin", "alice", "bob"):
        assert Task.objects.filter(created_by__username=username).exists()
    assert Task.objects.filter(status=Task.Status.COMPLETED).exists()
    assert Task.objects.filter(assignee__username="bob", created_by__username="alice").exists()
    assert any(task.is_overdue for task in Task.objects.all())


def test_seed_is_idempotent():
    seed()
    first_count = Task.objects.count()

    output = seed()

    assert Task.objects.count() == first_count
    assert User.objects.count() == 3
    assert "already" in output


def test_seed_resets_demo_passwords():
    seed()
    alice = User.objects.get(username="alice")
    alice.set_password("changed")
    alice.save()

    seed()

    assert authenticate(username="alice", password="demo1234") is not None


def test_seed_can_generate_extra_tasks_for_benchmarks():
    seed()
    before = Task.objects.count()

    output = seed("--extra-tasks", "250")

    assert Task.objects.count() == before + 250
    assert "250 extra tasks" in output
