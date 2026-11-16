import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.core.api.pagination import StandardPagination


def paginate(items, **params):
    paginator = StandardPagination()
    request = Request(APIRequestFactory().get("/items/", params))
    page = paginator.paginate_queryset(items, request)
    return paginator.get_paginated_response(page).data


def test_default_page_size_is_ten():
    data = paginate(list(range(25)))

    assert data["count"] == 25
    assert data["total_pages"] == 3
    assert data["current_page"] == 1
    assert data["page_size"] == 10
    assert data["results"] == list(range(10))
    assert data["previous"] is None
    assert data["next"].endswith("?page=2")


def test_client_can_choose_page_and_size():
    data = paginate(list(range(25)), page=2, page_size=5)

    assert data["current_page"] == 2
    assert data["page_size"] == 5
    assert data["results"] == [5, 6, 7, 8, 9]


@pytest.mark.parametrize("requested", [500, 101])
def test_page_size_is_capped(requested):
    data = paginate(list(range(300)), page_size=requested)

    assert data["page_size"] == StandardPagination.max_page_size == 100
    assert len(data["results"]) == 100
