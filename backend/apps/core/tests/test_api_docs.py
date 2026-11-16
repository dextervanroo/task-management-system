import pytest
from django.urls import reverse
from rest_framework import status

pytestmark = pytest.mark.django_db


@pytest.fixture
def schema(api_client):
    response = api_client.get(reverse("schema-json", kwargs={"format": "json"}))
    assert response.status_code == status.HTTP_200_OK
    return response.json()


def test_schema_documents_every_endpoint(schema):
    paths = set(schema["paths"])

    assert {
        "/auth/login/",
        "/auth/refresh/",
        "/auth/logout/",
        "/users/",
        "/users/me/",
        "/tasks/",
        "/tasks/{id}/",
        "/tasks/{id}/complete/",
    } <= paths


def test_schema_declares_bearer_authentication(schema):
    assert schema["securityDefinitions"]["Bearer"] == {
        "type": "apiKey",
        "name": "Authorization",
        "in": "header",
        "description": "JWT access token, as `Bearer <token>`.",
    }


def test_schema_uses_camel_case_bodies(schema):
    task_properties = schema["definitions"]["Task"]["properties"]

    assert {"dueDate", "assigneeDetail", "isOverdue", "createdBy"} <= set(task_properties)


def test_schema_documents_snake_case_filters(schema):
    parameters = {param["name"] for param in schema["paths"]["/tasks/"]["get"]["parameters"]}

    assert {"status", "due_date", "due_date_after", "due_date_before", "overdue"} <= parameters
    assert {"page", "page_size", "search", "ordering"} <= parameters


@pytest.mark.parametrize("name", ["schema-swagger-ui", "schema-redoc"])
def test_documentation_pages_are_public(api_client, name):
    response = api_client.get(reverse(name))

    assert response.status_code == status.HTTP_200_OK
