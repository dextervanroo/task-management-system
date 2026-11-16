import pytest

from apps.tasks.selectors import visible_tasks_for
from apps.tasks.tests.factories import TaskFactory

pytestmark = pytest.mark.django_db


def test_user_sees_created_and_assigned_tasks_only(user, other_user):
    created = TaskFactory(created_by=user)
    assigned = TaskFactory(created_by=other_user, assignee=user)
    TaskFactory(created_by=other_user)
    TaskFactory(created_by=other_user, assignee=other_user)

    assert set(visible_tasks_for(user)) == {created, assigned}


def test_task_created_and_assigned_to_same_user_is_listed_once(user):
    TaskFactory(created_by=user, assignee=user)

    assert visible_tasks_for(user).count() == 1


def test_staff_sees_every_task(staff_user, user, other_user):
    TaskFactory(created_by=user)
    TaskFactory(created_by=other_user)

    assert visible_tasks_for(staff_user).count() == 2
