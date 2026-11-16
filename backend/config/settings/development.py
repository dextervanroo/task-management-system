"""Local development settings."""

from .base import *  # noqa: F401,F403
from .base import INSTALLED_APPS, MIDDLEWARE, env

DEBUG = env.bool("DJANGO_DEBUG", default=True)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"])
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:5173", "http://127.0.0.1:5173"]
)

# django-silk records every request and its SQL queries at /silk/ (staff only).
INSTALLED_APPS = [*INSTALLED_APPS, "silk"]
MIDDLEWARE = [*MIDDLEWARE, "silk.middleware.SilkyMiddleware"]
SILKY_AUTHENTICATION = True
SILKY_AUTHORISATION = True
SILKY_PYTHON_PROFILER = env.bool("SILKY_PYTHON_PROFILER", default=False)
SILKY_MAX_RECORDED_REQUESTS = 10_000
SILKY_MAX_RECORDED_REQUESTS_CHECK_PERCENT = 10
