from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "full_name")
        read_only_fields = fields

    def get_full_name(self, user) -> str:
        return str(user)


class CurrentUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ("is_staff",)
        read_only_fields = fields
