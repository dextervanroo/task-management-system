#!/bin/sh
# Starts the web server that matches DJANGO_ENV.
set -e

if [ "${DJANGO_ENV:-development}" = "production" ]; then
    python manage.py collectstatic --noinput
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers "${GUNICORN_WORKERS:-3}" \
        --access-logfile -
fi

exec python manage.py runserver 0.0.0.0:8000
