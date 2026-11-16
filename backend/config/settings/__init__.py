"""Settings package.

The active module is chosen through the ``DJANGO_ENV`` environment variable
(``development`` by default, ``production`` or ``test``). When the variable is not
exported, it is read from the repository ``.env`` file.
"""

import os
from pathlib import Path

import environ

ENVIRONMENTS = ("development", "production", "test")
REPO_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


def get_environment() -> str:
    """Return the validated ``DJANGO_ENV`` value."""
    environment = os.environ.get("DJANGO_ENV")
    if environment is None and REPO_ENV_FILE.exists():
        environ.Env.read_env(REPO_ENV_FILE)
        environment = os.environ.get("DJANGO_ENV")
    environment = environment or "development"
    if environment not in ENVIRONMENTS:
        raise ValueError(f"DJANGO_ENV must be one of {ENVIRONMENTS}, got {environment!r}.")
    return environment


def configure_settings_module() -> str:
    """Point ``DJANGO_SETTINGS_MODULE`` at the module for ``DJANGO_ENV``."""
    module = f"config.settings.{get_environment()}"
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", module)
    return module
