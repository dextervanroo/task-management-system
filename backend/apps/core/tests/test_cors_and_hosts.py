import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

ALLOWED_ORIGIN = "http://localhost:5173"


def test_allowed_origin_receives_cors_headers(api_client):
    response = api_client.get(reverse("health"), HTTP_ORIGIN=ALLOWED_ORIGIN)

    assert response.headers["Access-Control-Allow-Origin"] == ALLOWED_ORIGIN


def test_unknown_origin_receives_no_cors_headers(api_client):
    response = api_client.get(reverse("health"), HTTP_ORIGIN="https://evil.example.com")

    assert "Access-Control-Allow-Origin" not in response.headers


def test_preflight_allows_authorization_header(api_client):
    response = api_client.options(
        reverse("task-list"),
        HTTP_ORIGIN=ALLOWED_ORIGIN,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,content-type",
    )

    assert response.status_code == 200
    assert "authorization" in response.headers["Access-Control-Allow-Headers"]


def test_preflight_from_unknown_origin_is_not_allowed(api_client):
    response = api_client.options(
        reverse("task-list"),
        HTTP_ORIGIN="https://evil.example.com",
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="DELETE",
    )

    assert "Access-Control-Allow-Origin" not in response.headers


def test_unknown_host_is_rejected(api_client):
    response = api_client.get(reverse("health"), HTTP_HOST="attacker.example.com")

    assert response.status_code == 400
