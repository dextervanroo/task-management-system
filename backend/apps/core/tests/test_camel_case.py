import io
import json

from rest_framework.settings import api_settings


def test_default_renderer_outputs_camel_case():
    renderer = api_settings.DEFAULT_RENDERER_CLASSES[0]()

    body = renderer.render({"due_date": "2026-01-01", "assignee_detail": {"first_name": "Ann"}})

    assert json.loads(body) == {"dueDate": "2026-01-01", "assigneeDetail": {"firstName": "Ann"}}


def test_default_parser_accepts_camel_case():
    parser = api_settings.DEFAULT_PARSER_CLASSES[0]()
    stream = io.BytesIO(json.dumps({"dueDate": "2026-01-01", "assignee": None}).encode())

    assert parser.parse(stream) == {"due_date": "2026-01-01", "assignee": None}
