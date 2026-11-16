from rest_framework.permissions import BasePermission


class CanDeleteTask(BasePermission):
    """Only the task creator or a staff user may delete a task.

    Read and update access is already limited by the visible-tasks queryset.
    """

    message = "Only the task creator can delete this task."

    def has_object_permission(self, request, view, task):
        if request.method != "DELETE":
            return True
        return request.user.is_staff or task.created_by_id == request.user.pk
