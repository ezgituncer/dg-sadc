# Installation Guide — Workload Tracking Application

This guide walks through a clean install of the project from scratch. Each section can stand on its own:

1. [Prerequisites](#prerequisites)
2. [Database (PostgreSQL)](#database-postgresql)
3. [Backend (FastAPI)](#backend-fastapi)
4. [Frontend (Angular v20)](#frontend-angular-v20)
5. [Quick Start with Docker Compose](#quick-start-with-docker-compose)
6. [Verifying the Install](#verifying-the-install)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these on your machine before continuing:

| Tool | Version | Notes |
|---|---|---|
| Python | 3.11+ | Backend runtime |
| Node.js | 20+ (LTS) | Frontend runtime |
| npm | 10+ | Ships with Node |
| PostgreSQL | 15+ | Database (or use Docker) |
| Docker + Docker Compose | latest | Optional — easiest way to run Postgres |
| Git | any | To clone the repo |

Clone the repository:

```bash
git clone <repo-url> test-app
cd test-app
```

---

## Database (PostgreSQL)

You need **two databases**: `workload_dev` (the app) and `workload_test` (pytest). Pick **one** of the options below.

### Option A — Docker Compose (recommended for dev)

The repo ships a `docker-compose.dev.yml` that boots PostgreSQL 15 and auto-creates both databases via `backend/scripts/init-db.sh`.

```bash
# from repo root
docker compose -f docker-compose.dev.yml up -d

# verify
docker compose -f docker-compose.dev.yml ps
docker exec -it workload_postgres psql -U workload -d workload_dev -c '\l'
```

Connection details:
- Host: `localhost`
- Port: `5432`
- User: `workload`
- Password: `workload`
- Databases: `workload_dev`, `workload_test`

To stop / wipe:

```bash
docker compose -f docker-compose.dev.yml down            # stop
docker compose -f docker-compose.dev.yml down -v         # stop + delete volume
```

### Option B — Local PostgreSQL install

Install PostgreSQL 15+, then run:

```bash
# create role
sudo -u postgres psql -c "CREATE USER workload WITH PASSWORD 'workload' CREATEDB;"

# create databases
sudo -u postgres psql -c "CREATE DATABASE workload_dev OWNER workload;"
sudo -u postgres psql -c "CREATE DATABASE workload_test OWNER workload;"

# grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE workload_dev  TO workload;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE workload_test TO workload;"
```

Verify the connection:

```bash
psql -h localhost -U workload -d workload_dev -c 'SELECT version();'
```

---

## Backend (FastAPI)

### 1. Create the virtualenv

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # macOS / Linux
# .venv\Scripts\activate             # Windows PowerShell
```

### 2. Install Python dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs FastAPI, SQLAlchemy 2.x async, Alembic, asyncpg, psycopg2-binary, python-jose (JWT), passlib + bcrypt, slowapi, pytest, etc.

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

The defaults work against Option A above. Key variables:

```env
DATABASE_URL=postgresql+asyncpg://workload:workload@localhost:5432/workload_dev
DATABASE_URL_SYNC=postgresql+psycopg2://workload:workload@localhost:5432/workload_dev
TEST_DATABASE_URL=postgresql+asyncpg://workload:workload@localhost:5432/workload_test
TEST_DATABASE_URL_SYNC=postgresql+psycopg2://workload:workload@localhost:5432/workload_test

JWT_SECRET=dev-secret-change-me-in-production-please   # generate a real secret in prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Set true to seed the 6 test accounts (admin@, hr.manager@, eng.manager@, frontend.lead@, qa.lead@, developer1@)
SEED_USERS=true

CORS_ORIGINS=http://localhost:4200
```

> Generate a strong JWT secret for production: `python -c "import secrets; print(secrets.token_hex(32))"`

### 4. Run database migrations (creates all tables)

Alembic reads the URL from `.env` via `app.core.config`. Apply every migration to bring an empty database to the latest schema:

```bash
# still inside backend/, with the venv active
alembic upgrade head
```

This runs the three migrations in order:

| Revision | What it does |
|---|---|
| `7b82b69f7bac_initial_schema.py` | Creates every table: `users`, `roles`, `teams`, `projects`, `activity_types`, `project_categories`, `non_project_categories`, `self_imp_categories`, `task_types`, `workload_entries`, `expected_working_days`, `refresh_tokens`, etc. (with FKs, indexes, and CHECK constraints for `status` / `complexity`) |
| `80eb395bb86c_seed_lookups.py` | Seeds reference data: roles, teams, activity types (IDs 1=PROJECT, 2=NON_PROJECT, 3=SELF_IMP), default categories, task types |
| `16ff16a147eb_seed_users_dev_only.py` | Seeds the 6 test accounts — **only runs when `SEED_USERS=true`** |

Useful Alembic commands:

```bash
alembic current              # show current revision
alembic history              # list all revisions
alembic downgrade -1         # roll back one migration
alembic downgrade base       # drop everything Alembic created
alembic upgrade head         # re-apply
```

If you ever need to start over from scratch:

```bash
# Option A (Docker): wipe the volume
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d

# Option B (local): drop & recreate
psql -h localhost -U workload -d postgres -c "DROP DATABASE workload_dev;"
psql -h localhost -U workload -d postgres -c "CREATE DATABASE workload_dev OWNER workload;"
alembic upgrade head
```

### 5. Run the backend

```bash
# from backend/, venv active
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Swagger UI: `http://localhost:8000/docs`.

### 6. Run backend tests (optional)

```bash
pytest                       # all tests
pytest -v                    # verbose
pytest app/tests/test_auth.py  # one file
```

Tests use the `workload_test` database.

---

## Frontend (Angular v20)

### 1. Install Node dependencies

```bash
cd frontend
npm install
```

This installs Angular 20 (standalone + signals), chart.js, ng2-charts, html2canvas, lucide-angular, and the dev toolchain (Angular CLI, Karma, Jasmine, TypeScript).

### 2. Configure the API URL

`src/environments/environment.ts` (dev) defaults to:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',
  showSeedAccountsHint: true,
};
```

Edit if your backend runs on a different host/port. `environment.prod.ts` is used for production builds.

### 3. Run the dev server

```bash
npm start            # = ng serve, port 4200 with live reload
```

Open `http://localhost:4200`. Login with any of the seeded accounts (see [CLAUDE.md](CLAUDE.md)) — the login screen also shows them under the amber hint toggle when `SEED_USERS=true`.

### 4. Build for production

```bash
npm run build        # outputs to dist/frontend
```

### 5. Run frontend tests (optional)

```bash
npm test                                   # interactive (Chrome)
npm test -- --watch=false --browsers=ChromeHeadless   # CI
```

---

## Quick Start with Docker Compose

If you just want everything running at once (Postgres + backend + frontend Nginx), use the production-style compose file:

```bash
# from repo root, set required env vars first
export JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
export SEED_USERS=true
export CORS_ORIGINS=http://localhost
export WEB_PORT=80

docker compose up --build -d
```

Services:
- `workload_db` — PostgreSQL 15
- `workload_api` — FastAPI (auto-runs `alembic upgrade head` on startup)
- `workload_web` — Nginx serving the built Angular bundle on port `${WEB_PORT}`

```bash
docker compose ps
docker compose logs -f backend
docker compose down
docker compose down -v        # also wipe the database volume
```

---

## Verifying the Install

After everything is up:

| Check | URL / command | Expected |
|---|---|---|
| Postgres reachable | `psql -h localhost -U workload -d workload_dev -c '\dt'` | List of ~15 tables |
| Backend health | `curl http://localhost:8000/api/v1/health` | `{"status":"ok"}` (or 200) |
| Swagger | `http://localhost:8000/docs` | OpenAPI UI |
| Frontend | `http://localhost:4200` | Login screen renders |
| Login flow | `admin@company.com` / `admin123` | Lands on dashboard |

---

## Troubleshooting

**`alembic upgrade head` fails with "could not connect to server"**
The database isn't running, or `DATABASE_URL_SYNC` in `.env` is wrong. Confirm `psql -h localhost -U workload -d workload_dev` works first.

**`asyncpg.InvalidPasswordError`**
The role's password doesn't match `.env`. Reset it: `sudo -u postgres psql -c "ALTER USER workload PASSWORD 'workload';"`.

**Login returns 401 even with seeded accounts**
You ran migrations with `SEED_USERS=false`. Either re-run with `SEED_USERS=true` (and roll the seed migration back/forward) or insert users manually via the admin endpoint.

**CORS errors in the browser console**
Add the frontend origin to `CORS_ORIGINS` in `backend/.env` (comma-separated) and restart uvicorn.

**Port 4200 / 8000 / 5432 already in use**
Either stop the conflicting process or change the port (`uvicorn ... --port 8001`, `ng serve --port 4201`, edit `docker-compose.dev.yml`).

**`alembic` can't find a revision**
Make sure you're running it from `backend/` (where `alembic.ini` lives) with the venv active.

**Frontend fails to load fonts / icons**
Network/firewall blocking Google Fonts. The app degrades gracefully — letters render in the system fallback font.
