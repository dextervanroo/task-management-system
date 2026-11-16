"""Settings used by the pytest suite: fast and isolated from external services."""

from .base import *  # noqa: F401,F403

ENVIRONMENT = "test"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost"]
CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# Run Celery jobs synchronously, without a broker.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TASK_IGNORE_RESULT = False
CELERY_BROKER_URL = "memory://"
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
