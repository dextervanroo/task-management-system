# Common commands for the whole repository. Run `make help` for the list.
# Tools run inside the docker-compose containers, so only Docker is required.

BACKEND = docker compose exec backend poetry run
FRONTEND = docker compose exec frontend

.DEFAULT_GOAL := help
.PHONY: help setup use-development use-production up down rebuild ps logs backend-logs \
	frontend-logs celery-logs migrate makemigrations seed createsuperuser shell backend-lint \
	backend-format backend-test backend-test-cov frontend-install frontend-lint frontend-test \
	frontend-test-cov lint test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Setup and environments -------------------------------------------------

setup: ## Create .env from .env.example, start the stack and seed demo data
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")
	docker compose up -d --build
	$(BACKEND) python manage.py seed

use-development: ## Switch .env to development settings and restart the stack
	@sed -i 's/^DJANGO_ENV=.*/DJANGO_ENV=development/; s/^DJANGO_DEBUG=.*/DJANGO_DEBUG=true/' .env
	@echo "Switched to DEVELOPMENT"
	docker compose up -d --build

use-production: ## Switch .env to production settings and restart the stack
	@sed -i 's/^DJANGO_ENV=.*/DJANGO_ENV=production/; s/^DJANGO_DEBUG=.*/DJANGO_DEBUG=false/' .env
	@echo "Switched to PRODUCTION (set DJANGO_SECURE_SSL_REDIRECT=false in .env to browse over plain HTTP)"
	docker compose up -d --build

# --- Docker -----------------------------------------------------------------

up: ## Start every service in the background
	docker compose up -d

down: ## Stop every service
	docker compose down

rebuild: ## Rebuild the images and restart
	docker compose up -d --build

ps: ## Show the services and their health
	docker compose ps

logs: ## Follow the logs of every service
	docker compose logs -f

backend-logs: ## Follow the API logs
	docker compose logs -f backend

frontend-logs: ## Follow the Vite/nginx logs
	docker compose logs -f frontend

celery-logs: ## Follow the Celery worker and beat logs
	docker compose logs -f celery-worker celery-beat

clean: ## Stop everything and DELETE the database and node_modules volumes
	docker compose down -v

# --- Django -----------------------------------------------------------------

migrate: ## Apply database migrations
	$(BACKEND) python manage.py migrate

makemigrations: ## Create migrations for model changes
	$(BACKEND) python manage.py makemigrations

seed: ## Create the demo users and tasks (safe to repeat)
	$(BACKEND) python manage.py seed

createsuperuser: ## Create an admin account interactively
	$(BACKEND) python manage.py createsuperuser

shell: ## Open a Django shell
	$(BACKEND) python manage.py shell

# --- Backend code quality and tests -----------------------------------------

backend-lint: ## Run flake8, isort and black checks
	$(BACKEND) flake8 .
	$(BACKEND) isort --check-only .
	$(BACKEND) black --check .

backend-format: ## Sort imports and format the backend code
	$(BACKEND) isort .
	$(BACKEND) black .

backend-test: ## Run pytest (pass extra options with ARGS="...")
	$(BACKEND) pytest $(ARGS)

backend-test-cov: ## Run pytest and write an HTML coverage report to backend/htmlcov
	$(BACKEND) pytest --cov-report=html $(ARGS)

# --- Frontend code quality and tests ----------------------------------------

frontend-install: ## Install frontend dependencies in the container
	$(FRONTEND) npm install

frontend-lint: ## Run ESLint and the TypeScript compiler
	$(FRONTEND) npm run lint
	$(FRONTEND) npx tsc -b

frontend-test: ## Run Vitest
	$(FRONTEND) npm run test

frontend-test-cov: ## Run Vitest with coverage (report in frontend/coverage)
	$(FRONTEND) npm run test:coverage

# --- Both stacks -------------------------------------------------------------

lint: backend-lint frontend-lint ## Lint backend and frontend

test: backend-test frontend-test ## Test backend and frontend
