import factory
from django.contrib.auth import get_user_model

DEFAULT_PASSWORD = "S3cure-pass!"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = get_user_model()
        django_get_or_create = ("username",)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda user: f"{user.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.PostGenerationMethodCall("set_password", DEFAULT_PASSWORD)

    @factory.post_generation
    def save_password(obj, create, extracted, **kwargs):
        if create:
            obj.save(update_fields=["password"])


class StaffUserFactory(UserFactory):
    is_staff = True
    is_superuser = True
