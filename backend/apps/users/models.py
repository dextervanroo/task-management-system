from django.contrib.auth.models import AbstractUser

from apps.core.models import TimeStampedModel, UUIDModel


class User(UUIDModel, TimeStampedModel, AbstractUser):
    """Application user identified by a UUID primary key."""

    class Meta(AbstractUser.Meta):
        ordering = ("username",)

    def __str__(self) -> str:
        return self.get_full_name() or self.username
