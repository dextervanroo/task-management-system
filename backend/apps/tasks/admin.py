from django.contrib import admin

from apps.tasks.models import Task
from apps.tasks.selectors import not_overdue_tasks, overdue_tasks


class OverdueFilter(admin.SimpleListFilter):
    title = "overdue"
    parameter_name = "overdue"

    def lookups(self, request, model_admin):
        return (("yes", "Yes"), ("no", "No"))

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return overdue_tasks(queryset)
        if self.value() == "no":
            return not_overdue_tasks(queryset)
        return queryset


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "priority",
        "due_date",
        "assignee",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "priority", OverdueFilter, "due_date")
    search_fields = ("title", "assignee__username", "created_by__username")
    # One JOIN instead of one query per row for the FK columns.
    list_select_related = ("assignee", "created_by")
    # Avoid loading every user into <select> widgets on the change page.
    autocomplete_fields = ("assignee", "created_by")
    readonly_fields = ("completed_at", "created_at", "updated_at")
    date_hierarchy = "due_date"
    list_per_page = 50
    # Skip the extra unfiltered COUNT(*) on large tables.
    show_full_result_count = False
