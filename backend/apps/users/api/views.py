from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.api.serializers import CurrentUserSerializer, UserSerializer
from apps.users.selectors import list_active_users


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Active users, read-only, so tasks can be assigned to them."""

    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_queryset(self):
        return list_active_users()

    @action(detail=False, methods=["get"], serializer_class=CurrentUserSerializer)
    def me(self, request):
        """The authenticated user."""
        return Response(self.get_serializer(request.user).data)
