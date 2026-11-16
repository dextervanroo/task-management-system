from django.utils import timezone
from rest_framework import serializers

from apps.core.api.mixins import EagerLoadingSerializerMixin
from apps.tasks.models import Task
from apps.users.api.serializers import UserSerializer
from apps.users.selectors import list_active_users


class TaskSerializer(EagerLoadingSerializerMixin, serializers.ModelSerializer):
    select_related_fields = ("assignee", "created_by")

    assignee = serializers.PrimaryKeyRelatedField(
        queryset=list_active_users(), allow_null=True, required=False
    )
    assignee_detail = UserSerializer(source="assignee", read_only=True)
    created_by = UserSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "assignee",
            "assignee_detail",
            "created_by",
            "completed_at",
            "is_overdue",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("completed_at", "created_at", "updated_at")

    def validate_due_date(self, value):
        unchanged = self.instance is not None and self.instance.due_date == value
        if value is not None and not unchanged and value < timezone.localdate():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value
