import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.test import APIRequestFactory

from apps.core.api.mixins import EagerLoadingSerializerMixin, EagerLoadingViewMixin
from apps.tasks.models import Task
from apps.tasks.tests.factories import TaskFactory
from apps.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


class TaskWithUsersSerializer(EagerLoadingSerializerMixin, serializers.ModelSerializer):
    select_related_fields = ("assignee", "created_by")
    prefetch_related_fields = ("created_by__created_tasks",)

    assignee = serializers.StringRelatedField()
    created_by = serializers.StringRelatedField()
    sibling_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ("id", "assignee", "created_by", "sibling_count")

    def get_sibling_count(self, task):
        return len(task.created_by.created_tasks.all())


class PlainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ("id",)


class TaskListView(EagerLoadingViewMixin, generics.ListAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskWithUsersSerializer
    permission_classes = [AllowAny]
    pagination_class = None


def query_count(view):
    with CaptureQueriesContext(connection) as context:
        response = view(APIRequestFactory().get("/tasks/"))
        response.render()
    return len(context.captured_queries)


def test_serializer_mixin_applies_select_and_prefetch():
    queryset = TaskWithUsersSerializer.setup_eager_loading(Task.objects.all())

    assert queryset.query.select_related == {"assignee": {}, "created_by": {}}
    assert queryset._prefetch_related_lookups == ("created_by__created_tasks",)


def test_serializer_mixin_without_fields_returns_queryset_unchanged():
    class Bare(EagerLoadingSerializerMixin, PlainSerializer):
        pass

    queryset = Task.objects.all()

    assert Bare.setup_eager_loading(queryset) is queryset


def test_view_mixin_keeps_query_count_constant():
    TaskFactory.create_batch(2, assignee=UserFactory())
    view = TaskListView.as_view()
    baseline = query_count(view)

    TaskFactory.create_batch(10, assignee=UserFactory())

    assert query_count(view) == baseline == 2


def test_view_mixin_ignores_serializers_without_eager_loading():
    class PlainView(TaskListView):
        serializer_class = PlainSerializer

    TaskFactory()

    assert query_count(PlainView.as_view()) == 1
