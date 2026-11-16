import pytest

from config import settings as settings_package


@pytest.fixture
def clean_env(monkeypatch, tmp_path):
    monkeypatch.delenv("DJANGO_ENV", raising=False)
    monkeypatch.delenv("DJANGO_SETTINGS_MODULE", raising=False)
    monkeypatch.setattr(settings_package, "REPO_ENV_FILE", tmp_path / ".env")
    return tmp_path / ".env"


def test_defaults_to_development(clean_env):
    assert settings_package.configure_settings_module() == "config.settings.development"


def test_uses_exported_environment(clean_env, monkeypatch):
    monkeypatch.setenv("DJANGO_ENV", "production")

    assert settings_package.configure_settings_module() == "config.settings.production"


def test_reads_environment_from_env_file(clean_env):
    clean_env.write_text("DJANGO_ENV=production\n")

    assert settings_package.get_environment() == "production"


def test_rejects_unknown_environment(clean_env, monkeypatch):
    monkeypatch.setenv("DJANGO_ENV", "staging")

    with pytest.raises(ValueError, match="DJANGO_ENV must be one of"):
        settings_package.get_environment()
