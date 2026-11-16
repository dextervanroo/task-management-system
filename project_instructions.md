## **<u>Project Overview</u>** 

Please build a RESTful API for a simple task management system (or another domain if you prefer) using Django. The API should allow users to: 

- Create, read, update, and delete tasks. 

- Assign tasks to users. Mark tasks as completed. 

- Filter tasks based on status and due date. 

## **<u>Requirements</u>** 

### **Backend** 

- **API Development:** 

   - Use **Django (Django REST Framework)** in the latest possible version for it to match with other libraries.

   - Use Python 3.12 as the base.

   - Implement CRUD endpoints for managing tasks. 

   - Use **JWT authentication** with username/password input for login.

   - Implement **pagination** for listing tasks. 

   - Support filtering tasks by status and due date using `django-filter` library.

	- Use `camelCase` for default rendering in API return but `snake_case` for the backend database names and variables.

- **Database:** 

   - Use **PostgreSQL** for data storage. 

   - Design a simple schema for storing tasks and users. 

- **Unit Testing:** 

   - Write unit tests for critical endpoints using **pytest**. Also set up conftest with important fixtures.

   - Ensure at least **80% test coverage** . 

- **Dockerization:** 

   - Provide **Dockerfile** and **docker-compose.yml** to setup local app and database. 

- **Documentation:** 

   - Include a **README.md** with setup instructions and document any key implementation decisions you consider relevant. 

   - Provide API documentation using **drf-yasg (Django)** . 

   - Use pyproject.toml with poetry.

- Add **rate limiting** to prevent API abuse. 

- Implement **background task processing** (e.g., Celery + Redis). 

### **Frontend** 

   - Please integrate the backend you just built with React.js + Vite + TypeScript.

   - Key criteria: 

      - The frontend should be responsive and user-friendly. 

      - Implement CRUD operations associated with the implemented use case. 

      - Structured code: Organize your components and state cleanly.
      
- Add testing with Vitest, focusing in both components and helpers as well.

- Also use Docker with the frontend

### **Submission Guidelines** 

- Include a **README.md** with setup instructions and any other documentation you deem necessary. 

- The application should have seeded data / credentials for demo purposes. 

- **Clean Architecture**: Your architecture should adhere to Clean Architecture principles, including separation of concerns and independence of components, as well as standard folder and file organization, using a monorepo styled development.

- **Application testing**: Your project should have sufficient test coverage. Use of TDD is preferable. 

- **Code quality**: Your code should be well-organized, readable, and adhere to best practices. Use `uuid` for model primary keys.

- **Functionality**: Your application should perform as expected in the requirements without errors or bugs. No warnings in the browser console.

-  **Performance**: Use `select_related` and `prefetch_related` for the database consultations. Also build a mixin class for serializers/views reusability. Finally, add indexes when gains are visible.

- **Admin**: Add admin pages for the models, guaranteeing page performance and filtering when necessary.

- **Security**: Add tests for security regarding outside access, throtling and rate limiting as well. Don't forget about setting up CORS and allowed hosts.

- **Pipelines**: Use pipelines for testing and linting, using black/flake8/isort for the backend and eslint for frontend, with a step for each usage/stack.

- **Environments**: Add production and development configurations in backend settings, adding `silk` for local performance analysis. Also include a `.env.example` file including examples for secrets and variables.

- **Makefile**: Add a Makefile for most used and common commands, like setting up Docker and changing environments. Only one file for the whole repository.

- **CLAUDE.md**: Construct a `CLAUDE.md` for the repository with code conventions, folder organization and project description.

## **<u>Implementation Decisions</u>**

Decisions agreed before implementation. They refine the requirements above.

### **Domain and data model**

- **Domain:** task management system.
- **User model:** custom `User` extending `AbstractUser`, with a UUID primary key, created in the first migration.
- **Task fields:** `id` (UUID), `title`, `description`, `status`, `priority`, `due_date`, `assignee` (one user, nullable), `created_by`, `completed_at`, `created_at`, `updated_at`.
- **Assignment:** each task has exactly one assignee (or none).
- **Statuses:** `pending`, `in_progress`, `completed`. Completing a task has its own action, `POST /tasks/{id}/complete/`, which also sets `completed_at`.
- **Due date filters:** exact date, date range (`due_date_after` / `due_date_before`) and an `overdue` boolean flag.

### **Permissions and authentication**

- **Visibility:** a user sees and edits the tasks they created or are assigned to. Only the creator or a staff user can delete a task. Staff users see all tasks.
- **Sign-up:** no public sign-up endpoint. Accounts come from the seed data or the admin. A read-only `GET /users/` endpoint lists users so the frontend can offer them for assignment.
- **JWT:** `djangorestframework-simplejwt`, with refresh-token rotation and blacklisting so logout invalidates the token.
- **Frontend token storage:** access token in memory, refresh token in `localStorage`. The README explains the trade-off.

### **Backend stack**

- **Django version:** the newest Django release supported by every required library (`drf-yasg`, `django-silk`, `djangorestframework-camel-case`, etc.). Versions are pinned and the choice is recorded in the README.
- **API documentation:** `drf-yasg` (Swagger 2.0), as required.
- **camelCase:** responses and request bodies use camelCase, through `djangorestframework-camel-case`. Query parameters stay in snake_case (e.g. `?due_date_after=...`).
- **Python version:** 3.12 everywhere (local, Docker, CI).
- **Clean Architecture (practical layers):** each Django app is split into `models.py`, `selectors.py` (reads, with `select_related` / `prefetch_related`), `services.py` (business rules), `tasks.py` (Celery jobs), `api/` (`serializers.py`, `views.py`, `filters.py`, `permissions.py`), `admin.py` and `tests/`. Shared mixins live in a `core` app. Views stay thin and services do not import DRF.
- **Background jobs:** Celery with Redis as the broker, plus Celery Beat for scheduling (its own `celery-beat` service in `docker-compose`). Jobs: (a) an email to the assignee when a task is assigned or reassigned, and (b) a daily email to each user listing their overdue tasks. Development uses the console email backend.
- **Rate limits:** DRF throttling with Redis as the cache. Rates are fixed in the settings code (not read from `.env`): anonymous users 50/min, logged-in users 1000/min, login endpoint 5/min per IP.
- **Settings:** `config/settings/{base,development,production}.py`, selected through the `DJANGO_ENV` variable. `silk` is enabled only in development. The pytest suite uses its own `config/settings/test.py` (in-memory cache, Celery jobs run eagerly, fast password hashing), so tests need only PostgreSQL and never depend on a developer's `.env`.

### **Frontend**

- **Language:** TypeScript.
- **Runtime dependencies (lean):** React 19, MUI and React Router only. API calls go through a small typed `fetch` client; state lives in React hooks and a Context for the logged-in user; forms use MUI components with hand-written validation helpers. No data-fetching, form or state-management libraries.
- **Tooling:** TypeScript 5, ESLint 9, Vitest with Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`), `jsdom` and `@vitest/coverage-v8`. `package.json` scripts: `dev`, `build`, `lint`, `test`, `test:coverage`.
- **Test coverage:** the 80% coverage target also applies to the frontend, enforced through Vitest's coverage thresholds.
- **Docker:** the frontend runs in `docker-compose` with the Vite dev server in development and as an nginx-served static build in production, so a single `make up` starts the whole stack.
- **Configuration:** `VITE_API_URL` is defined in the repository's root `.env` (there is no separate frontend `.env`).

### **Repository, CI and git**

- **Folder layout:** monorepo with `backend/`, `frontend/` and `.github/workflows/`, plus a single root `Makefile`, `docker-compose.yml`, `.env.example`, `README.md` and `CLAUDE.md`.
- **Docker Compose:** services `db`, `redis`, `backend`, `celery-worker`, `celery-beat` and `frontend`. Every service reads the root `.env` (no per-service overrides), and `DJANGO_ENV` also selects the image target (`development` or `production`). PostgreSQL and Redis are not published on host ports; tests and management commands run inside the containers. The backend has `stdin_open`/`tty` for debugger sessions.
- **Container users:** backend `make` commands run with the host user's ids, and the frontend image runs as the unprivileged `node` user, so files generated through the containers (migrations, coverage reports) are owned by the developer.
- **Makefile:** wraps the common commands, running tools through `docker compose exec` (`make setup`, `make test`, `make lint`, Django commands). `make use-development` / `make use-production` switch `DJANGO_ENV` in `.env` and restart the stack.
- **CI:** a single GitHub Actions workflow, `.github/workflows/lint.yml` (name `CI`), triggered on `push` and `pull_request`, with four jobs, each using `working-directory` defaults:
  - `backend-lint` (Python 3.12, Poetry 1.8.5, `poetry install --no-root --no-interaction`): separate steps for `black --check . --config pyproject.toml`, `flake8 . --config .flake8` and `isort --check-only --settings-file pyproject.toml .`.
  - `backend-test`: same setup plus a PostgreSQL service container (the test settings need no Redis), then a missing-migrations check and a `pytest` step (80% coverage gate).
  - `frontend-lint` (Node 22, npm cache on `frontend/package-lock.json`, `npm ci`): `npm run lint` (ESLint) and `npx tsc -b` (TypeScript).
  - `frontend-test`: same setup, then `npm run test:coverage` (Vitest, 80% coverage gate).
- **Demo data:** a `seed` management command creating `admin / admin123` (staff), `alice / demo1234` and `bob / demo1234`, each with sample tasks. It is idempotent and refuses to run with production settings unless `--force` is passed, so the demo passwords never reach a real deployment by accident.
- **Commit messages:** Conventional Commits in English (e.g. `feat(tasks): add task model with UUID pk`). Each commit adds a feature together with its tests, written test-first, so every commit is self-contained.
- **Branch:** all work happens on a local feature branch (`feat/initial-implementation`), not on `main`. Nothing is pushed and no PR is opened; the branch is reviewed and published manually.
- **Database indexes:** indexes on `status`, `due_date` and `(assignee, status)`, with the evidence for each (query plans or query counts) recorded in the README. The automatic single-column index on the `assignee` foreign key is disabled (`db_index=False`) because `(assignee, status)` starts with `assignee` and already serves those lookups. Queries that an index does not speed up (such as the daily overdue digest) get none. A reproducible benchmark (`backend/scripts/benchmark_indexes.sql`, `make benchmark-indexes`) backs the numbers.
