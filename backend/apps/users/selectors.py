from django.contrib.auth import get_user_model
from django.db.models import QuerySet

User = get_user_model()


def list_active_users() -> QuerySet:
    """Users that can log in and receive task assignments."""
    return User.objects.filter(is_active=True).order_by("username")
