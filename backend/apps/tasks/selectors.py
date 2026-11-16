"""Read-side queries for tasks."""

from django.db.models import Q, QuerySet

from apps.tasks.models import Task


def visible_tasks_for(user) -> QuerySet:
    """Tasks the user created or is assigned to; staff users see every task."""
    queryset = Task.objects.all()
    if user.is_staff:
        return queryset
    return queryset.filter(Q(created_by=user) | Q(assignee=user))
