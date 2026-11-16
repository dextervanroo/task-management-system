# Generative AI Usage

This project was built with an AI coding assistant working in the
repository under my direction. This document covers:

1. [The prompt](#1-the-prompt) used to generate the full implementation, and a shorter one for an API scaffold only.
2. [Representative output code](#2-output-code-samples).
3. How the output was [validated](#3-how-the-ais-suggestions-were-validated), [corrected](#4-corrections-and-improvements), checked for [edge cases, authentication and validation](#5-edge-cases-authentication-and-validation), and assessed for [performance and idiomatic quality](#6-performance-and-idiomatic-quality).

## How the work was organized

The AI did not get one big "build everything" request. It worked in steps,
with me making the decisions:

1. **Requirements in a file.** The specification lives in
   [`project_instructions.md`](project_instructions.md), versioned with the code.
2. **Questions before code.** The AI read the file and listed every unclear
   point as a checklist, each with a suggested default. I ticked the defaults I
   accepted and answered the rest one at a time. Every answer was written back
   into the file's *Implementation Decisions* section, so the file, not the
   chat history, is the source of truth.
3. **Small, test-first commits.** Each feature was built test-first (failing
   test, implementation, passing test, lint) and committed alone with a
   Conventional Commit message: 47 commits on a feature branch.
4. **Checking in the real environment.** Besides unit tests, the AI ran the
   stack in Docker, drove the frontend in a headless browser and measured the
   database queries.
5. **Course corrections.** At several points I redirected the work (follow my
   team's Docker and Makefile conventions, add a production guard to the seed
   command) and the AI adapted the existing code.

## 1. The prompt

### 1.1 The prompt I would use now for the full implementation

The improved version makes explicit everything the session showed to matter:
how to ask, where decisions live, how to commit, and what "done" means.

```text
You are a senior full-stack engineer working inside this repository.

## Input
`project_instructions.md` holds the requirements: a task management REST API
(Django + DRF) with a React + Vite frontend, in a monorepo. Read all of it
before doing anything else.

## Step 1 - Clarify before coding
- List every ambiguous, missing or conflicting requirement as a Markdown
  checklist grouped by area (data model, auth and permissions, backend stack,
  frontend, repository/CI/git). Give each item a recommended default so I can
  accept it by ticking it.
- Ask the unticked items one at a time.
- Write every agreed decision into an "Implementation Decisions" section of
  `project_instructions.md`, phrased as if it had been decided from the start.
- Before choosing library versions, check their declared compatibility (PyPI
  classifiers, npm peer dependencies) and pick the newest set that works
  together. Say why when it is not the latest release.

## Step 2 - Build
Work on a feature branch. Never push or open a PR unless I ask.
For each unit of work:
1. Write the tests first and confirm they fail.
2. Implement the smallest change that makes them pass.
3. Run the whole suite, the linters and the type checker.
4. Commit only that responsibility, with a Conventional Commit message in
   English whose body explains why. Each commit must pass on its own.

Backend expectations:
- Django apps split into models / selectors (reads) / services (writes and
  business rules, no DRF imports) / api (serializers, views, filters,
  permissions) / tasks (Celery) / admin / tests. Shared code in a `core` app.
- UUID primary keys on every model, including a custom User from the first
  migration. Enforce invariants with database constraints where possible.
- A reusable eager-loading mixin for serializers and views. Every list
  endpoint and admin changelist gets a test that fixes its query count.
- JWT (SimpleJWT) with refresh rotation and blacklisting; camelCase JSON
  bodies; snake_case query parameters; django-filter; page-number pagination;
  DRF throttling backed by Redis; drf-yasg docs; Celery + Redis + Beat for
  emails; CORS and ALLOWED_HOSTS.
- Settings split into base/development/production (selected by DJANGO_ENV),
  plus a test module that needs no Redis and ignores the developer's .env.
  django-silk in development only. Production must require its secrets.
- Add a database index only after measuring it on a realistic data volume.
  Keep the benchmark script in the repo and the numbers in the README.
- Demo seed data that refuses to run in production unless forced.

Frontend expectations:
- TypeScript strict, React + MUI + React Router only. One typed fetch client
  handles tokens, refresh and errors. Pure helpers live apart from components.
- Responsive down to 375px. Vitest + Testing Library; any console warning or
  error fails a test. Tests live in `__tests__/` folders next to the code:
  `*.unit.spec.ts` for helpers, hooks and API modules, and
  `*.integration.spec.tsx` for components and pages, each suite runnable on
  its own.

Security tests: anonymous access, access to other users' objects, forged or
wrong-type tokens, inactive users, throttling, CORS origins, unknown hosts.

## Step 3 - Prove it works
- Coverage at least 80% on both stacks, enforced by the tools.
- Start the whole stack with docker compose in both development and
  production modes and smoke-test the API, Celery and static files.
- Drive the real frontend in a headless browser through login, create,
  complete, filter, delete and logout, at desktop and phone widths, and
  report anything printed to the browser console.
- Containers must not leave root-owned files in the repository.
- Run the CI commands locally before declaring the pipeline done.

## Deliverables
Dockerfiles and docker-compose.yml, a root Makefile (including switching
environments), .env.example, a GitHub Actions workflow with one job per stack
and tool group, README.md (setup, API, decisions, index measurements),
CLAUDE.md (conventions and layout).

## Reporting
After each milestone, say in one or two lines what was done and verified.
Report failures with their output. Never claim something works without
having run it.
```

### 1.2 A shorter prompt for the API scaffold only

```text
Using the decisions in project_instructions.md, scaffold only the backend:
Poetry project, Django settings split by DJANGO_ENV, a core app with UUIDModel,
TimeStampedModel, pagination and eager-loading mixins, the custom User, the
Task model with its admin, and empty selectors/services/api modules wired into
the URLs. Include pytest + conftest fixtures, black/isort/flake8 configs and a
health endpoint with its test. Stop after the scaffold passes its tests and
lint, and list the endpoints still to implement.
```

## 2. Output code samples

The excerpts below are copied from the repository.

### Service layer: business rules without HTTP concerns

`backend/apps/tasks/services.py`. The completion timestamp always follows the
status, and the assignment email is only queued after the transaction commits,
so a rolled-back write never sends mail.

```python
def _sync_completion(task: Task) -> None:
    """Keep ``completed_at`` consistent with the status."""
    if task.status == Task.Status.COMPLETED:
        task.completed_at = task.completed_at or timezone.now()
    else:
        task.completed_at = None


def _notify_assignee(task: Task) -> None:
    """Email the assignee in the background once the transaction commits."""
    from apps.tasks.tasks import send_task_assigned_email

    task_id = str(task.pk)
    transaction.on_commit(lambda: send_task_assigned_email.delay(task_id))


@transaction.atomic
def update_task(task: Task, **fields) -> Task:
    previous_assignee_id = task.assignee_id
    for name, value in fields.items():
        setattr(task, name, value)
    _sync_completion(task)
    task.save()
    if task.assignee_id and task.assignee_id != previous_assignee_id:
        _notify_assignee(task)
    return task
```

### Thin viewset: visibility in the queryset, rules in services

`backend/apps/tasks/api/views.py`

```python
class TaskViewSet(EagerLoadingViewMixin, viewsets.ModelViewSet):
    """CRUD for the tasks the authenticated user created or is assigned to."""

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, CanDeleteTask]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ["title", "description"]
    ordering_fields = ["due_date", "created_at", "updated_at", "title", "status", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # schema generation, no real user
            return Task.objects.none()
        return self.apply_eager_loading(visible_tasks_for(self.request.user))

    def perform_create(self, serializer):
        serializer.instance = services.create_task(
            created_by=self.request.user, **serializer.validated_data
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark the task as completed and record when it happened."""
        task = services.complete_task(self.get_object())
        return Response(self.get_serializer(task).data)
```

### Reusable mixin against N+1 queries

`backend/apps/core/api/mixins.py`. The serializer declares the relations it
reads; the view applies them.

```python
class EagerLoadingSerializerMixin:
    select_related_fields: tuple[str, ...] = ()
    prefetch_related_fields: tuple = ()

    @classmethod
    def setup_eager_loading(cls, queryset: QuerySet) -> QuerySet:
        if cls.select_related_fields:
            queryset = queryset.select_related(*cls.select_related_fields)
        if cls.prefetch_related_fields:
            queryset = queryset.prefetch_related(*cls.prefetch_related_fields)
        return queryset


class EagerLoadingViewMixin:
    def get_queryset(self) -> QuerySet:
        return self.apply_eager_loading(super().get_queryset())

    def apply_eager_loading(self, queryset: QuerySet) -> QuerySet:
        setup_eager_loading = getattr(self.get_serializer_class(), "setup_eager_loading", None)
        if setup_eager_loading is None:
            return queryset
        return setup_eager_loading(queryset)
```

### Validation that respects existing data

`backend/apps/tasks/api/serializers.py`. A new due date cannot be in the past,
but editing an old, already-overdue task keeps working.

```python
def validate_due_date(self, value):
    unchanged = self.instance is not None and self.instance.due_date == value
    if value is not None and not unchanged and value < timezone.localdate():
        raise serializers.ValidationError("Due date cannot be in the past.")
    return value
```

### Frontend: one client for tokens, refresh and errors

`frontend/src/api/client.ts`. Concurrent requests share a single refresh, and
after a page reload the client refreshes before its first request instead of
failing with 401.

```ts
function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    const response = await send("/auth/refresh/", { method: "POST", body: { refresh } }, null);
    if (!response.ok) return false;
    setTokens((await parseBody(response)) as TokenPair);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true;

  // After a page reload only the refresh token survives: get a new access token
  // first instead of sending a request that is bound to fail with 401.
  if (auth && !getAccessToken() && getRefreshToken() && !(await refreshTokens())) {
    endSession();
  }

  let response = await send(path, options, auth ? getAccessToken() : null);

  if (response.status === 401 && auth && getRefreshToken()) {
    if (await refreshTokens()) {
      response = await send(path, options, getAccessToken());
    } else {
      endSession();
    }
  }

  const body = await parseBody(response);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}
```

### Tests that pin down performance and security

```python
# backend/apps/tasks/tests/test_tasks_api.py
def test_list_query_count_does_not_grow_with_rows(auth_client, user, django_assert_num_queries):
    TaskFactory.create_batch(3, created_by=user, assignee=UserFactory())
    with django_assert_num_queries(3):  # auth user + count + page with JOINs
        auth_client.get(TASKS)

    TaskFactory.create_batch(7, created_by=user, assignee=UserFactory())
    with django_assert_num_queries(3):
        auth_client.get(TASKS)


# backend/apps/tasks/tests/test_security.py
@pytest.mark.parametrize("method", ["get", "put", "patch", "delete"])
def test_other_users_task_is_hidden(auth_client, foreign_task, method):
    response = getattr(auth_client, method)(
        reverse("task-detail", args=[foreign_task.pk]), {"title": "Hijacked"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    foreign_task.refresh_from_db()
    assert foreign_task.title != "Hijacked"
```

## 3. How the AI's suggestions were validated

I didn't take any output on trust. Each suggestion had to pass checks that do
not depend on the AI's own judgment:

| Check | What it caught or confirmed |
|---|---|
| **Test first (red, then green)** | Every feature started with a failing test, which shows the test exercises the new code instead of passing by accident. |
| **Full suite, lint and types before each commit** | pytest (188 tests, 100% coverage), Vitest (127 tests, ~98%), black, isort, flake8, ESLint, `tsc -b`. A commit was only made with everything green. |
| **Compatibility checks before choosing versions** | PyPI classifiers showed `drf-yasg` and SimpleJWT support Django only up to 5.2, so Django 5.2 LTS was chosen over 6.x. npm peer dependencies were checked for Vite, Vitest, React Router and MUI. |
| **Running the real stack** | The development and production Docker targets were both started and smoke-tested: health check, login, CRUD, the Celery email in the worker log, WhiteNoise static files and the nginx SPA fallback. |
| **Headless browser run** | A Chrome DevTools Protocol script drove login, create, complete, filter, search, delete and logout at 1280px and 375px, collected console output and checked for horizontal scrolling. Screenshots were reviewed. |
| **Query measurements** | `EXPLAIN ANALYZE` on 200,000 tasks with and without each index (`make benchmark-indexes`). |
| **CI commands run locally** | Every step of the GitHub Actions workflow was run in the containers before the workflow was committed. |
| **My review at decision points** | The clarification checklist, each answer, and later instructions (follow my team's Docker conventions, guard the seed in production) were checkpoints where I accepted or redirected the work. |

## 4. Corrections and improvements

Verification found real problems in the AI's first versions, and every one was
fixed in its own commit. These came from running the code, not from reading it:

| Problem in the first version | How it was found | Fix |
|---|---|---|
| After a page reload the first API call went out without an access token, failed with 401 and printed a red error in the browser console. | Headless browser run | The client refreshes first when it only holds a refresh token. |
| `poetry run` in the container found the bind-mounted `backend/.venv` and rebuilt it as root with no packages, so `make seed` failed. | Running the Makefile targets | `POETRY_VIRTUALENVS_IN_PROJECT=false` in the image, and the broken venv was rebuilt. |
| Containers wrote root-owned files (migrations, coverage) into the repo. | Checking file ownership after `make` runs | Backend `make` commands run with the host user's ids; the frontend image runs as `node`. |
| In production mode the health check was redirected to HTTPS, failed, and blocked the frontend from starting. | Planning and testing `make use-production` | The health endpoint is exempt from the HTTPS redirect. |
| Two settings tests passed on the host but failed in Docker, where every `.env` variable is exported. | Running the suite inside the container | The tests check values the environment cannot change. |
| The `(assignee, status)` index added little, because Django already indexes every foreign key. | Index benchmark | The automatic `assignee` index was removed; the composite index then cut that query from ~19 ms to ~0.5 ms. |
| A search test was flaky because Faker-generated names could match the search term. | Repeated test runs | Deterministic names in the shared fixtures. |
| The data-loading hook called `setState` synchronously inside an effect. | ESLint `react-hooks` rules | Rewrote it to derive `loading` from a request key. |
| drf-yasg deprecation warning, and a WhiteNoise "no static directory" warning in tests. | pytest warnings summary | Set `SWAGGER_USE_COMPAT_RENDERERS = False`; enabled WhiteNoise only in production. |
| Version ranges pinned below the newest compatible releases (`django-filter ^25`, `gunicorn ^23`). | Comparing the lock file with PyPI | Raised to `^26.2` and `^27.0`. |
| A production bundle over Vite's 500 kB warning. | Build output | React and MUI split into cacheable vendor chunks. |
| Empty select fields looked blank instead of showing "All statuses" or "Unassigned". | Reviewing the screenshots | `displayEmpty` and a shrunk label. |
| The `seed` command would happily create `admin / admin123` in production. | My review | `seed` refuses to run with production settings unless `--force` is passed. |
| The Docker setup did not follow my team's conventions. | My review | Every service reads the shared `.env`, the database has no host port, and the Makefile switches environments with `use-development` / `use-production`. |

## 5. Edge cases, authentication and validation

**Authentication**
- JWT access tokens last 15 minutes. Refresh tokens rotate on every use, and
  the old one is blacklisted, as it is on logout. Tests prove that a reused
  or logged-out refresh token is rejected.
- A refresh token sent as an access token, a malformed or Basic header, and
  an inactive user's still-valid token are all rejected (tests in
  `test_security.py`).
- Login is limited to 5 attempts per minute per IP. Tests check that valid
  credentials are also blocked during the lockout and that the limit is per IP.
- Frontend: the access token stays in memory and the refresh token in
  `localStorage`; the README documents this trade-off. Concurrent 401s
  trigger a single refresh. A failed refresh signs the user out everywhere
  through a listener.

**Authorization**
- Visibility is enforced in the queryset, so other users' tasks answer 404 for
  every method and their ids cannot be probed. Deleting is a separate rule: an
  assignee who can see a task gets 403. Staff see and delete everything.
- The frontend hides the Delete button using the same rule, but the API is
  what enforces it.

**Validation**
- Title is required and limited to 200 characters. Status and priority must
  be valid choices. An unknown, malformed or inactive assignee is rejected.
  A due date cannot move into the past, but an existing past date may stay.
- Read-only fields (`createdBy`, `completedAt`) are ignored on write; a test
  tries to forge them.
- A database check constraint makes `completed_at` impossible without the
  `completed` status, and the other way round.
- Invalid filter values (`status=archived`, malformed dates) answer 400, and
  `page_size` is capped at 100. On the frontend, filters read from the URL are
  sanitized and an inverted date range is explained to the user.
- The client mirrors the server's form rules, and server field errors are
  shown next to the right inputs.

**Edge cases**
- Completing an already completed task keeps the original completion time.
- Reassigning sends one email, and saving without a new assignee sends none.
  A job for a task deleted in the meantime does nothing, and users without an
  email address are skipped.
- An unassigned overdue task appears in its creator's daily digest.
- An invalid UUID in the URL returns 404, not 500.
- Stale list requests are cancelled when filters change, so an old response
  cannot overwrite a newer one.
- Production settings refuse to start without a secret key, allowed hosts and
  CORS origins (tested). `seed` refuses to run in production unless forced.

## 6. Performance and idiomatic quality

**Performance**
- Query counts are fixed by tests: the task list always runs 3 queries,
  whatever the number of rows, and the admin changelist runs a constant
  number. The eager-loading mixins make this the default.
- Indexes are backed by measurements on 200,000 tasks: `status` ~17.6 ms →
  ~7.6 ms, `due_date` range ~17 ms → ~2.8 ms, `(assignee, status)` ~19 ms →
  ~0.5 ms. The overdue digest gained nothing from an index, so it has none.
  Full table in the README.
- The admin uses `list_select_related`, autocomplete widgets and
  `show_full_result_count = False` to avoid an extra `COUNT(*)`.
- Throttle counters live in Redis so the limits hold across workers. Celery
  uses late acknowledgement and a prefetch multiplier of 1.
- django-silk is available in development for profiling individual requests.
- Frontend: vendor chunks cached separately, requests cancelled when filters
  change, and search debounced by 300 ms.

**Idiomatic quality**
- Django and DRF idioms over custom machinery: `TextChoices`,
  `CheckConstraint`, `transaction.on_commit`, ViewSet `@action`, permission
  classes, `FilterSet`, a custom `PageNumberPagination`, `SimpleRateThrottle`.
- React idioms checked by the `react-hooks` ESLint rules, strict TypeScript,
  `import type`, Testing Library queries by role and accessible name.
- Consistent style enforced by black, isort, flake8 and ESLint, both locally
  and in CI. Conventions are written down in `CLAUDE.md`.

## 7. Limitations and what still needs a human

- Keeping the refresh token in `localStorage` is a deliberate trade-off for a
  demo; a production deployment should consider httpOnly cookies.
- drf-yasg produces Swagger 2.0 (a requirement); OpenAPI 3 would need
  drf-spectacular.
