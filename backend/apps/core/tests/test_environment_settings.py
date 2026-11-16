"""The development and production modules are not active under pytest, so load them explicitly."""

import importlib

import pytest
from django.core.exceptions import ImproperlyConfigured


def load(module_name):
    module = importlib.import_module(module_name)
    return importlib.reload(module)


def test_development_enables_debug(monkeypatch):
    monkeypatch.delenv("DJANGO_DEBUG", raising=False)

    development = load("config.settings.development")

    assert development.DEBUG is True
    assert "localhost" in development.ALLOWED_HOSTS
    assert "http://localhost:5173" in development.CORS_ALLOWED_ORIGINS


def test_silk_is_enabled_only_in_development(monkeypatch):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "a-production-secret")
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "api.example.com")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com")

    development = load("config.settings.development")
    production = load("config.settings.production")

    assert "silk" in development.INSTALLED_APPS
    assert "silk.middleware.SilkyMiddleware" in development.MIDDLEWARE
    assert "silk" not in production.INSTALLED_APPS
    assert "silk.middleware.SilkyMiddleware" not in production.MIDDLEWARE


def test_production_is_secure_by_default(monkeypatch):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "a-production-secret")
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "api.example.com")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com")

    production = load("config.settings.production")

    assert production.DEBUG is False
    assert production.ALLOWED_HOSTS == ["api.example.com"]
    assert production.CORS_ALLOWED_ORIGINS == ["https://app.example.com"]
    assert production.SECURE_SSL_REDIRECT is True
    assert production.SESSION_COOKIE_SECURE is True
    assert production.CSRF_COOKIE_SECURE is True
    assert production.SECURE_HSTS_SECONDS > 0


@pytest.mark.parametrize(
    "missing", ["DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS", "CORS_ALLOWED_ORIGINS"]
)
def test_production_requires_secrets(monkeypatch, missing):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "a-production-secret")
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "api.example.com")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com")
    monkeypatch.delenv(missing)

    with pytest.raises(ImproperlyConfigured):
        load("config.settings.production")
