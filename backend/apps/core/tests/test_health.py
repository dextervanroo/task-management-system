from django.urls import reverse
from rest_framework import status


def test_health_check_is_public(api_client):
    response = api_client.get(reverse("health"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}
