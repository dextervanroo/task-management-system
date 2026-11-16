import uuid

import pytest
from django.contrib.auth import get_user_model

from apps.users.tests.factories import DEFAULT_PASSWORD, UserFactory

pytestmark = pytest.mark.django_db


def test_auth_user_model_is_custom_user():
    assert get_user_model()._meta.label == "users.User"


def test_user_primary_key_is_uuid():
    user = UserFactory()

    assert isinstance(user.pk, uuid.UUID)


def test_user_records_timestamps():
    user = UserFactory()

    assert user.created_at is not None
    assert user.updated_at >= user.created_at


def test_user_password_is_hashed():
    user = UserFactory()

    assert user.password != DEFAULT_PASSWORD
    assert user.check_password(DEFAULT_PASSWORD)


def test_full_name_falls_back_to_username():
    assert str(UserFactory(username="alice", first_name="", last_name="")) == "alice"
    assert str(UserFactory(username="bob", first_name="Bob", last_name="Smith")) == "Bob Smith"
