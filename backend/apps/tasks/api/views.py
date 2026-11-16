from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.api.mixins import EagerLoadingViewMixin
from apps.tasks import services
from apps.tasks.api.filters import TaskFilter
from apps.tasks.api.permissions import CanDeleteTask
from apps.tasks.api.serializers import TaskSerializer
from apps.tasks.selectors import visible_tasks_for


class TaskViewSet(EagerLoadingViewMixin, viewsets.ModelViewSet):
    """CRUD for the tasks the authenticated user created or is assigned to."""

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, CanDeleteTask]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ["title", "description"]
    ordering_fields = ["due_date", "created_at", "updated_at", "title", "status", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return self.apply_eager_loading(visible_tasks_for(self.request.user))

    def perform_create(self, serializer):
        serializer.instance = services.create_task(
            created_by=self.request.user, **serializer.validated_data
        )

    def perform_update(self, serializer):
        services.update_task(serializer.instance, **serializer.validated_data)

    def perform_destroy(self, instance):
        services.delete_task(instance)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark the task as completed and record when it happened."""
        task = services.complete_task(self.get_object())
        return Response(self.get_serializer(task).data)
