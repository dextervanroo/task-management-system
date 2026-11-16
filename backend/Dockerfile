# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Shared base: Python, Poetry and the dependency manifest.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=1.8.5 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

WORKDIR /app
RUN pip install "poetry==${POETRY_VERSION}"
COPY pyproject.toml poetry.lock ./

# ---------------------------------------------------------------------------
# Development: includes dev tools (pytest, linters, silk). Code is bind-mounted.
# ---------------------------------------------------------------------------
FROM base AS development
RUN poetry install --no-root --with dev
COPY . .
RUN chmod +x scripts/*.sh
EXPOSE 8000
ENTRYPOINT ["scripts/entrypoint.sh"]
CMD ["scripts/start.sh"]

# ---------------------------------------------------------------------------
# Production: runtime dependencies only, non-root user, gunicorn.
# ---------------------------------------------------------------------------
FROM base AS production
RUN poetry install --no-root --only main
COPY . .
RUN chmod +x scripts/*.sh \
    && useradd --create-home --uid 1000 app \
    && mkdir -p staticfiles && chown app:app staticfiles
USER app
EXPOSE 8000
ENTRYPOINT ["scripts/entrypoint.sh"]
CMD ["scripts/start.sh"]
