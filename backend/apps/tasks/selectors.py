"""Read-side queries for tasks."""

from django.db.models import Q, QuerySet
from django.utils import timezone

from apps.tasks.models import Task


def visible_tasks_for(user) -> QuerySet:
    """Tasks the user created or is assigned to; staff users see every task."""
    queryset = Task.objects.all()
    if user.is_staff:
        return queryset
    return queryset.filter(Q(created_by=user) | Q(assignee=user))


def overdue_tasks(queryset: QuerySet | None = None) -> QuerySet:
    """Open tasks whose due date has passed."""
    queryset = Task.objects.all() if queryset is None else queryset
    return queryset.filter(due_date__lt=timezone.localdate()).exclude(status=Task.Status.COMPLETED)


def not_overdue_tasks(queryset: QuerySet) -> QuerySet:
    return queryset.exclude(pk__in=overdue_tasks(queryset).values("pk"))
