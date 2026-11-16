# CLAUDE.md

Guidance for working in this repository. See `README.md` for setup and the API
reference, and `project_instructions.md` for the original requirements and the
agreed implementation decisions.

## Project

A task management system in a monorepo:

- `backend/`: Django 5.2 LTS + Django REST Framework API (Python 3.12, Poetry),
  PostgreSQL, JWT auth (SimpleJWT), django-filter, drf-yasg docs, Celery + Redis
  background jobs.
- `frontend/`: React 19 + TypeScript + Vite + MUI + React Router. No other
  runtime dependencies: no data-fetching, form or state libraries.
- Everything runs through `docker-compose.yml`; the root `Makefile` wraps the
  common commands (`make help`).

Users create tasks, assign them to one user, complete them and filter them by
status, due date and overdue. Users see only tasks they created or are assigned
to; staff see all. Only the creator or staff can delete.

## Commands

Run tools through `make` (they execute inside the containers):

```bash
make setup             # first run: .env, build, start, seed
make test              # backend + frontend tests
make lint              # flake8, isort, black, ESLint, tsc
make backend-format    # isort + black
make backend-test ARGS="apps/tasks -x"
make makemigrations && make migrate
make use-development / make use-production   # switch DJANGO_ENV in .env
```

Before committing, `make lint` and `make test` must pass. Coverage must stay at or
above 80% on both stacks (currently ~100% backend, ~98% frontend).

## Folder organization

```
backend/
  config/settings/{base,development,production,test}.py   # selected by DJANGO_ENV
  apps/core/    shared: UUIDModel/TimeStampedModel, api/ (mixins, pagination,
                throttling, docs, health), management/commands/seed.py
  apps/users/   custom User (UUID pk), auth endpoints, read-only users endpoint
  apps/tasks/   models, selectors, services, notifications, tasks (Celery),
                admin, api/ (serializers, views, filters, permissions, urls), tests/
  scripts/      entrypoint.sh, start.sh, benchmark_indexes.sql
frontend/src/
  api/          client.ts (fetch + JWT refresh), tokenStorage.ts, types.ts, endpoint modules
  auth/         AuthContext, AuthProvider, useAuth, RequireAuth
  components/   app-wide UI (AppLayout, ConfirmDialog)
  features/tasks/  components/, hooks/, pure helpers (taskFormat, taskFilters,
                   taskValidation, permissions)
  pages/        route screens
  test/         setup.ts, render.tsx (renderWithProviders), fixtures.ts
```

## Backend conventions

- **Layers:** views stay thin, validating with the serializer and calling a
  service. Write logic goes in `services.py` (no DRF imports), read queries in
  `selectors.py`, email building in `notifications.py`, Celery jobs in
  `tasks.py` (thin wrappers).
- **Models:** extend `UUIDModel` and `TimeStampedModel` from `apps.core.models`.
  Every primary key is a UUID. Enforce invariants with DB constraints when possible.
- **Queries:** never introduce N+1 queries. Serializers declare
  `select_related_fields` / `prefetch_related_fields` through
  `EagerLoadingSerializerMixin`; views use `EagerLoadingViewMixin` (or
  `apply_eager_loading` when building their own queryset). Add a test that fixes
  the number of queries for list endpoints.
- **Indexes:** add one only when a measurement shows a gain; update
  `scripts/benchmark_indexes.sql` and the README table.
- **API style:** JSON bodies are camelCase (djangorestframework-camel-case);
  query parameters stay snake_case. Default pagination is `StandardPagination`
  (10 per page, `page_size` up to 100).
- **Permissions:** limit visibility in the queryset (other users' objects
  answer 404), and use permission classes for action rules (403).
- **Settings:** shared values go in `base.py`; secrets and hosts come from the
  environment through django-environ. Throttle rates are fixed in `base.py` on
  purpose. Silk is development-only.
- **Background work:** queue Celery jobs with
  `transaction.on_commit(lambda: job.delay(...))` and pass ids, not model
  instances.
- **Style:** black and isort (line length 100), flake8. Type hints on public
  functions.

## Frontend conventions

- TypeScript strict mode; import with the `@/` alias; use `import type` for types.
- All HTTP goes through `apiRequest` in `src/api/client.ts`. Add endpoint
  functions to an `api/*.ts` module; components never call `fetch`.
- Keep logic in pure helpers (`features/<feature>/*.ts`) and test them directly.
  Components handle rendering and wiring.
- Server data lives in small hooks (`useTasks`, `useUsers`) that abort stale
  requests. Shared client state uses Context (only auth today).
- UI uses MUI components with the `sx` prop; layouts must work at 375px width
  (use responsive values such as `{ xs, sm, md }`).
- Filters live in the URL search params (`taskFilters.ts` handles the conversion).
- No browser console warnings: the test setup fails any test that calls
  `console.warn` or `console.error`.

## Testing conventions

- Write tests first (TDD) and ship each feature with its tests.
- Backend: pytest + pytest-django + factory-boy. Shared fixtures are in
  `backend/conftest.py` (`api_client`, `auth_client`, `other_client`,
  `staff_client`, `user`, `other_user`, `staff_user`); factories are in
  `apps/*/tests/factories.py`. Tests must not depend on the developer's `.env`.
- Frontend: Vitest + Testing Library + user-event. Render with
  `renderWithProviders` from `src/test/render.tsx`, build data with
  `src/test/fixtures.ts`, and mock API modules with `vi.spyOn`. Query elements
  by role and accessible name.

## Git conventions

- Conventional Commits in English (`feat(tasks): ...`, `fix(frontend): ...`,
  `build(docker): ...`, `docs: ...`).
- One responsibility per commit, with its tests, so every commit passes on its own.
- Work on a feature branch; do not commit directly to `main`.
