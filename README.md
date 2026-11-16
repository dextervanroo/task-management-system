# Task Management System

A task manager with a Django REST API and a React frontend. Users log in, create
tasks, assign them to each other, mark them as completed and filter them by
status and due date. Assignees get an email when a task is assigned to them,
and everyone gets a daily digest of their overdue tasks.

| | |
|---|---|
| **Backend** | Python 3.12, Django 5.2 LTS, Django REST Framework, SimpleJWT, django-filter, drf-yasg, Celery + Redis, PostgreSQL 16 |
| **Frontend** | React 19, TypeScript 5, Vite, MUI, React Router |
| **Quality** | pytest (100% coverage), Vitest + Testing Library (~98%), black, isort, flake8, ESLint, GitHub Actions |
| **Tooling** | Docker Compose, Poetry, a single root `Makefile` |

## Contents

- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Everyday commands](#everyday-commands)
- [Environments](#environments)
- [API](#api)
- [Project structure](#project-structure)
- [Testing and CI](#testing-and-ci)
- [Implementation decisions](#implementation-decisions)
- [Database indexes and measurements](#database-indexes-and-measurements)

## Quick start

Requirements: Docker with Compose v2 and `make`.

```bash
make setup
```

This copies `.env.example` to `.env` (if there is no `.env` yet), builds and starts
every service, applies the migrations and seeds the demo data. Then open:

| URL | What |
|---|---|
| http://localhost:5173 | Frontend |
| http://localhost:8000/api/docs/ | Swagger UI (ReDoc at `/api/redoc/`, schema at `/api/swagger.json`) |
| http://localhost:8000/admin/ | Django admin (log in as `admin`) |
| http://localhost:8000/silk/ | Request and SQL profiler, development only (log in to the admin first) |

Without `make`: `cp .env.example .env && docker compose up -d --build && docker compose exec backend python manage.py seed`.

## Demo accounts

Created by `make seed` (safe to run again; it resets these passwords):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Staff: sees every task, can use the admin |
| `alice` | `demo1234` | Regular user |
| `bob` | `demo1234` | Regular user |

Each account starts with sample tasks in every status, including overdue tasks
and tasks assigned to the other users.

## Everyday commands

`make help` lists everything. The most used targets:

| Command | Does |
|---|---|
| `make up` / `make down` | Start / stop the stack |
| `make rebuild` | Rebuild images (after changing dependencies) and restart |
| `make logs`, `make backend-logs`, `make celery-logs` | Follow logs |
| `make migrate`, `make makemigrations`, `make seed`, `make shell` | Django management |
| `make test` | Backend and frontend tests |
| `make lint` | flake8, isort, black, ESLint and TypeScript |
| `make backend-format` | Apply isort and black |
| `make backend-test ARGS="-k tasks -x"` | Pass options to pytest |
| `make backend-test-cov`, `make frontend-test-cov` | HTML coverage reports |
| `make benchmark-indexes` | Re-run the index measurements below |
| `make clean` | Stop and **delete** the database and dependency volumes |

All tools run inside the containers, so nothing besides Docker has to be
installed on the host. Backend commands run with your user id, so generated
files (migrations, coverage reports) belong to you.

## Environments

The active environment is the `DJANGO_ENV` variable in `.env`. It selects both
the Django settings module and the Docker image targets.

| | `development` | `production` |
|---|---|---|
| Switch with | `make use-development` | `make use-production` |
| Settings | `config/settings/development.py` | `config/settings/production.py` |
| API server | `runserver` with auto-reload | gunicorn, static files served by WhiteNoise |
| Frontend | Vite dev server with hot reload | Static build served by nginx |
| Debug and profiling | `DEBUG=True`, django-silk at `/silk/` | `DEBUG=False`, no silk |
| Emails | Printed to the Celery worker log | SMTP settings from `.env` |
| Security | Relaxed defaults | `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` are required; HTTPS redirect, HSTS and secure cookies are on |

Both targets serve the API on port 8000 and the frontend on port 5173. To try
the production stack locally over plain HTTP, set
`DJANGO_SECURE_SSL_REDIRECT=false` in `.env`.

Every variable is documented in [`.env.example`](.env.example). The pytest
suite uses its own `config/settings/test.py`: an in-memory cache, eager Celery
jobs and fast password hashing.

## API

All endpoints live under `/api/`. Swagger UI at `/api/docs/` documents every
field and parameter; click **Authorize** and enter `Bearer <access token>`.

| Method and path | Purpose |
|---|---|
| `POST /auth/login/` | `{username, password}` → `{access, refresh}` |
| `POST /auth/refresh/` | `{refresh}` → a new pair; the old refresh token is blacklisted |
| `POST /auth/logout/` | `{refresh}` → blacklists the refresh token |
| `GET /users/` | Active users (for the assignee picker), `?search=` |
| `GET /users/me/` | The logged-in user |
| `GET /tasks/` | Tasks the user created or is assigned to (staff: all), paginated |
| `POST /tasks/` | Create a task; the creator is the logged-in user |
| `GET/PUT/PATCH/DELETE /tasks/{id}/` | Read, update or delete a task |
| `POST /tasks/{id}/complete/` | Mark a task as completed and record `completedAt` |
| `GET /health/` | Liveness probe, no authentication |

**Conventions**

- **camelCase bodies, snake_case query parameters.** Request and response JSON
  uses camelCase (`dueDate`, `assigneeDetail`). Query parameters are not
  converted, so filters keep their snake_case names.
- **Filters on `GET /tasks/`:** `status` (one or several, comma-separated:
  `?status=pending,in_progress`), `priority`, `assignee`, `due_date` (exact),
  `due_date_after` / `due_date_before` (inclusive range), `overdue=true|false`,
  `search` (title and description), `ordering` (`due_date`, `-created_at`,
  `title`, `status`, `priority`, `updated_at`).
- **Pagination:** `?page=` and `?page_size=` (default 10, max 100). Responses
  include `count`, `totalPages`, `currentPage`, `pageSize`, `next`, `previous`
  and `results`.
- **Rate limits:** 50 requests/min for anonymous clients, 1000/min per user and
  5 login attempts/min per IP. Over the limit the API answers `429` with
  `Retry-After`.
- **Permissions:** a user sees and edits the tasks they created or are assigned
  to; anything else answers `404`, so task ids cannot be probed. Only the
  creator or a staff user can delete a task (`403` for an assignee).

Example:

```bash
ACCESS=$(curl -s -X POST localhost:8000/api/auth/login/ -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"demo1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access"])')
curl -s "localhost:8000/api/tasks/?status=pending&overdue=true&ordering=due_date" \
  -H "Authorization: Bearer $ACCESS"
```

## Project structure

```
.
├── backend/
│   ├── config/                  # Project package: settings, urls, celery, wsgi/asgi
│   │   └── settings/            # base, development, production, test
│   ├── apps/
│   │   ├── core/                # Shared code: abstract models, API mixins, pagination,
│   │   │                        # throttling, docs, health check, seed command
│   │   ├── users/               # Custom User (UUID pk), auth and users endpoints
│   │   └── tasks/               # The task domain (layers below)
│   ├── scripts/                 # Container entrypoint, start script, index benchmark
│   ├── conftest.py              # Shared pytest fixtures (clients, users, cache reset)
│   ├── Dockerfile               # development and production targets
│   └── pyproject.toml           # Poetry dependencies and tool configs
├── frontend/
│   ├── src/
│   │   ├── api/                 # Typed fetch client, token storage, endpoint modules
│   │   ├── auth/                # AuthProvider, useAuth, RequireAuth
│   │   ├── components/          # App-wide UI (layout, confirm dialog)
│   │   ├── features/tasks/      # Task components, hooks and pure helpers
│   │   ├── pages/               # Route-level screens
│   │   └── test/                # Test setup, render helper, fixtures
│   ├── Dockerfile               # development (Vite) and production (nginx) targets
│   └── vite.config.ts           # Vite and Vitest configuration
├── .github/workflows/lint.yml   # CI: lint and test jobs per stack
├── docker-compose.yml
├── Makefile
└── .env.example
```

Each Django app follows the same layers:

```
apps/tasks/
├── models.py        # Data and invariants (check constraint, indexes)
├── selectors.py     # Read queries: who sees which tasks, overdue tasks
├── services.py      # Business rules for writes; no HTTP or DRF imports
├── notifications.py # Builds the emails
├── tasks.py         # Celery jobs (thin wrappers around notifications)
├── admin.py
├── api/             # serializers, views, filters, permissions, urls
└── tests/
```

## Testing and CI

- **Backend:** `make backend-test`. Uses pytest and pytest-django with
  factory-boy, runs against PostgreSQL and fails under 80% coverage (currently
  100%). Covers every endpoint, permissions and access from outside (anonymous
  users, other users' tasks, forged or refresh tokens), rate limiting, CORS and
  `ALLOWED_HOSTS`, the Celery jobs, the admin's query counts and the settings of
  each environment.
- **Frontend:** `make frontend-test`. Uses Vitest with Testing Library and fails
  under 80% coverage (currently ~98%). Covers components, pages, hooks and the
  pure helpers. Any `console.warn` or `console.error` during a test fails it,
  to keep the browser console clean.
- **CI** (`.github/workflows/lint.yml`) runs on every push and pull request with
  four jobs: `backend-lint` (black, flake8 and isort as separate steps),
  `backend-test` (migration check and pytest against a PostgreSQL service),
  `frontend-lint` (ESLint and TypeScript) and `frontend-test` (Vitest with
  coverage).

## Implementation decisions

**Django 5.2 LTS instead of the newest Django.** `drf-yasg` and
`djangorestframework-simplejwt` declare support up to Django 5.2, so 5.2 LTS is
the newest release every required library supports. All versions are pinned in
`backend/poetry.lock` and `frontend/package-lock.json`.

**Practical Clean Architecture.** Views are thin: they validate input with a
serializer and call a service. Services hold the business rules (for example,
keeping `completed_at` consistent with the status, and queueing the assignment
email only after the transaction commits). Selectors hold the read queries,
shared by the API, the admin and the Celery jobs. Services do not depend on DRF,
so they can be used from management commands and jobs.

**Reusable mixins against N+1 queries.** A serializer declares the relations it
reads (`select_related_fields`, `prefetch_related_fields`) through
`EagerLoadingSerializerMixin`, and `EagerLoadingViewMixin` applies them to the
view's queryset. Tests check that list endpoints and the admin changelist run a
constant number of queries regardless of how many rows they show.

**UUID primary keys everywhere.** Every model, including the custom `User`
created in the first migration, extends `UUIDModel`. Ids cannot be guessed or
counted.

**Data integrity in the database.** A check constraint guarantees that a task
has `completed_at` if and only if its status is `completed`.

**JWT token storage.** The access token (15 minutes) lives only in memory, so a
script reading `localStorage` cannot steal it. The refresh token (1 day) is in
`localStorage` so a page reload keeps the session. It rotates on every refresh,
and the old one is blacklisted, as it is on logout. Trade-off: an XSS bug could
still read the refresh token. An httpOnly cookie would prevent that, but needs
CSRF protection and same-site deployment, which was out of scope. After a
reload, the client refreshes before its first request, so no request fails
with 401.

**Rate limiting in Redis.** Throttle counters are stored in the Redis cache, so
the limits hold across gunicorn workers. The rates are fixed in
`config/settings/base.py`, not configurable from the environment.

**Background jobs.** Celery with Redis as the broker and Celery Beat for the
schedule. Assigning or reassigning a task emails the assignee; every day at
08:00 each user receives one email listing their overdue tasks (an unassigned
task counts for its creator). The email bodies are built in
`notifications.py` and the Celery tasks only send them.

**Admin performance.** The task changelist uses `list_select_related`,
autocomplete widgets instead of `<select>` lists of every user, an overdue
filter, date hierarchy, search and `show_full_result_count = False` (no extra
`COUNT(*)` on large tables).

**Frontend structure.** The only runtime dependencies are React, MUI and React
Router. Server calls go through one typed `fetch` client that handles tokens,
refresh and errors. Feature code lives in `features/tasks` with pure helpers
(formatting, filters, validation) kept apart from components so they are easy
to test. The task filters are stored in the URL, so filtered views can be
bookmarked and survive a reload.

**Security.** Explicit CORS origin allowlist, `ALLOWED_HOSTS`, production-only
HTTPS redirect, HSTS and secure cookies (the health check is exempt from the
redirect so container probes over HTTP keep working), throttled login, and
`404` instead of `403` for other users' tasks.

## Database indexes and measurements

Indexes were kept only where measurements showed a gain.
`make benchmark-indexes` runs `backend/scripts/benchmark_indexes.sql`: inside
a transaction that is rolled back, it inserts 200,000 tasks for 500 users and
compares `EXPLAIN ANALYZE` results with and without the indexes.

| Query (API use) | With index | Without | Index |
|---|---|---|---|
| Staff list filtered by `status`, newest 10 | ~7.6 ms | ~17.6 ms | `status` |
| Tasks due in the next 7 days, newest 10 | ~2.8 ms | ~17.1 ms | `due_date` |
| Count for that date range (pagination) | ~2.5 ms | ~16.6 ms | `due_date` |
| A user's visible tasks with a status | ~0.5 ms | ~19.3 ms | `(assignee, status)` + `created_by` FK index |
| Daily overdue digest (all open, past-due tasks) | ~20 ms | ~19 ms | none: reads ~20% of rows, an index does not help |

Django adds a single-column index to every foreign key. For `assignee` it was
removed (`db_index=False`) because the `(assignee, status)` index starts with
`assignee` and already serves those lookups; keeping both would only slow down
writes.
