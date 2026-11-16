from django_filters import rest_framework as filters

from apps.tasks.models import Task
from apps.tasks.selectors import not_overdue_tasks, overdue_tasks


class ChoiceInFilter(filters.BaseInFilter, filters.ChoiceFilter):
    """Comma-separated list of choices, e.g. ``?status=pending,in_progress``."""


class TaskFilter(filters.FilterSet):
    status = ChoiceInFilter(choices=Task.Status.choices)
    priority = filters.ChoiceFilter(choices=Task.Priority.choices)
    assignee = filters.UUIDFilter(field_name="assignee")
    due_date = filters.DateFilter(field_name="due_date")
    due_date_after = filters.DateFilter(field_name="due_date", lookup_expr="gte")
    due_date_before = filters.DateFilter(field_name="due_date", lookup_expr="lte")
    overdue = filters.BooleanFilter(method="filter_overdue")

    class Meta:
        model = Task
        fields = ("status", "priority", "assignee", "due_date")

    def filter_overdue(self, queryset, name, value):
        return overdue_tasks(queryset) if value else not_overdue_tasks(queryset)
