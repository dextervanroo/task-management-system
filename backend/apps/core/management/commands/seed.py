"""Seed demo users and tasks.

Safe to run repeatedly: users are created or reset, sample tasks are only
created for users that have none. ``--extra-tasks N`` bulk-inserts N random
tasks, used to measure query plans and index gains on a realistic volume.
"""

import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.tasks.models import Task

User = get_user_model()

DEMO_USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "first_name": "Ada",
        "last_name": "Admin",
        "is_staff": True,
        "is_superuser": True,
    },
    {"username": "alice", "password": "demo1234", "first_name": "Alice", "last_name": "Anderson"},
    {"username": "bob", "password": "demo1234", "first_name": "Bob", "last_name": "Brown"},
]

# (title, description, status, priority, due in days or None, assignee username or None)
SAMPLE_TASKS = {
    "admin": [
        ("Review access permissions", "Audit staff accounts.", "pending", "high", 2, None),
        ("Plan sprint demo", "Prepare slides and agenda.", "in_progress", "medium", 5, "alice"),
    ],
    "alice": [
        (
            "Write onboarding guide",
            "Cover local setup and conventions.",
            "in_progress",
            "high",
            3,
            None,
        ),
        (
            "Fix login page layout",
            "Button overlaps on small screens.",
            "pending",
            "medium",
            1,
            "bob",
        ),
        ("Update dependencies", "", "pending", "low", -2, None),
        ("Prepare quarterly report", "Numbers for Q3.", "completed", "high", -5, None),
        ("Design task filters", "Status and due date filters.", "pending", "medium", None, "bob"),
    ],
    "bob": [
        (
            "Set up CI pipeline",
            "Lint and test jobs for both stacks.",
            "completed",
            "high",
            -1,
            None,
        ),
        ("Add pagination to API", "", "in_progress", "medium", 4, None),
        ("Write API tests", "Cover the critical endpoints.", "pending", "high", -1, "alice"),
        ("Clean up old branches", "", "pending", "low", 10, None),
    ],
}


class Command(BaseCommand):
    help = "Create demo users and sample tasks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--extra-tasks",
            type=int,
            default=0,
            help="Also bulk-insert this many random tasks (for performance tests).",
        )

    @transaction.atomic
    def handle(self, *args, extra_tasks=0, **options):
        users = {spec["username"]: self._upsert_user(spec) for spec in DEMO_USERS}
        for username, tasks in SAMPLE_TASKS.items():
            self._create_sample_tasks(users[username], tasks, users)
        if extra_tasks:
            self._create_extra_tasks(extra_tasks, list(users.values()))
            self.stdout.write(f"Created {extra_tasks} extra tasks.")
        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        for spec in DEMO_USERS:
            self.stdout.write(f"  {spec['username']} / {spec['password']}")

    def _upsert_user(self, spec):
        spec = dict(spec)
        password = spec.pop("password")
        username = spec.pop("username")
        user, created = User.objects.update_or_create(
            username=username, defaults={**spec, "email": f"{username}@example.com"}
        )
        user.set_password(password)
        user.save(update_fields=["password"])
        self.stdout.write(f"{'Created' if created else 'Updated'} user {username}.")
        return user

    def _create_sample_tasks(self, creator, tasks, users):
        if creator.created_tasks.exists():
            self.stdout.write(f"Tasks for {creator.username} already exist, skipping.")
            return
        today = timezone.localdate()
        Task.objects.bulk_create(
            Task(
                title=title,
                description=description,
                status=status,
                priority=priority,
                due_date=None if due_in is None else today + timedelta(days=due_in),
                assignee=users.get(assignee),
                created_by=creator,
                completed_at=timezone.now() if status == Task.Status.COMPLETED else None,
            )
            for title, description, status, priority, due_in, assignee in tasks
        )
        self.stdout.write(f"Created {len(tasks)} tasks for {creator.username}.")

    def _create_extra_tasks(self, count, users):
        today = timezone.localdate()
        statuses = list(Task.Status.values)
        priorities = list(Task.Priority.values)
        now = timezone.now()

        def random_task(number):
            status = random.choice(statuses)
            return Task(
                title=f"Generated task {number}",
                status=status,
                priority=random.choice(priorities),
                due_date=today + timedelta(days=random.randint(-60, 60)),
                assignee=random.choice([*users, None]),
                created_by=random.choice(users),
                completed_at=now if status == Task.Status.COMPLETED else None,
            )

        Task.objects.bulk_create((random_task(n) for n in range(count)), batch_size=5_000)
