"""WSGI entry point."""

from django.core.wsgi import get_wsgi_application

from config.settings import configure_settings_module

configure_settings_module()

application = get_wsgi_application()
