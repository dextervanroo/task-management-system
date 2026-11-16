import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from apps.tasks.tests.factories import TaskFactory
from apps.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

CHANGELIST = reverse("admin:tasks_task_changelist")


def count_changelist_queries(client, params=None):
    with CaptureQueriesContext(connection) as context:
        response = client.get(CHANGELIST, params or {})
    assert response.status_code == 200
    return len(context.captured_queries)


def test_changelist_query_count_does_not_grow_with_rows(admin_client):
    TaskFactory.create_batch(2, assignee=UserFactory())
    baseline = count_changelist_queries(admin_client)

    for _ in range(10):
        TaskFactory(assignee=UserFactory())

    assert count_changelist_queries(admin_client) == baseline


@pytest.mark.parametrize(
    "params",
    [
        {"status__exact": "pending"},
        {"priority__exact": "high"},
        {"overdue": "yes"},
        {"overdue": "no"},
        {"q": "report"},
    ],
)
def test_changelist_filters(admin_client, params):
    TaskFactory(title="Quarterly report")

    count_changelist_queries(admin_client, params)


def test_change_page_renders(admin_client):
    task = TaskFactory(assignee=UserFactory())

    response = admin_client.get(reverse("admin:tasks_task_change", args=[task.pk]))

    assert response.status_code == 200
