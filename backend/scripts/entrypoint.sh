#!/bin/sh
# Applies migrations before starting the web server. Celery services skip this.
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    python manage.py migrate --noinput
fi

exec "$@"
