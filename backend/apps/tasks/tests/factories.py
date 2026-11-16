import factory

from apps.tasks.models import Task
from apps.users.tests.factories import UserFactory


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    title = factory.Sequence(lambda n: f"Task {n}")
    description = factory.Faker("sentence")
    created_by = factory.SubFactory(UserFactory)
    assignee = None
