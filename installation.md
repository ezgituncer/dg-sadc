# Installation Guide — Workload Tracking Application (Windows)

This guide walks through a clean install of the project from scratch on **Windows 10 / 11**. Commands assume **PowerShell** (the default Windows terminal) — `cmd.exe` works too with minor tweaks noted inline.

1. [Prerequisites](#prerequisites)
2. [Installing Docker Desktop](#installing-docker-desktop)
3. [Installing PostgreSQL via Docker](#installing-postgresql-via-docker)
4. [Backend (FastAPI)](#backend-fastapi)
5. [Frontend (Angular v20)](#frontend-angular-v20)
6. [Quick Start with Docker Compose (full stack)](#quick-start-with-docker-compose-full-stack)
7. [Verifying the Install](#verifying-the-install)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install the following before continuing. Easiest path on Windows is **winget** (preinstalled on Win 11 / recent Win 10).

| Tool | Version | Winget command |
|---|---|---|
| Git | any | `winget install --id Git.Git` |
| Python | 3.11+ | `winget install --id Python.Python.3.12` |
| Node.js (LTS) | 20+ | `winget install --id OpenJS.NodeJS.LTS` |
| Docker Desktop | latest | `winget install --id Docker.DockerDesktop` |
| (optional) Postgres client | 15+ | `winget install --id PostgreSQL.PostgreSQL.15` — only needed if you want `psql` outside the container |

After every install, **open a new PowerShell window** so `PATH` updates pick up.

Verify each tool:

```powershell
git --version
python --version
node --version
npm --version
docker --version
```

Clone the repository:

```powershell
git clone <repo-url> test-app
cd test-app
```

---

## Installing Docker Desktop

Docker is the easiest way to run PostgreSQL on Windows — no native Postgres install required.

### 1. Enable WSL 2 (one-time setup)

Docker Desktop on Windows runs containers inside WSL 2. Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

Reboot when prompted. After reboot, run `wsl --status` to confirm `Default Version: 2`. If it shows 1, run `wsl --set-default-version 2`.

### 2. Install Docker Desktop

```powershell
winget install --id Docker.DockerDesktop
```

Or download from <https://www.docker.com/products/docker-desktop>.

After install:
1. Launch **Docker Desktop** from the Start menu.
2. Accept the license, sign in (optional), and wait for the whale icon in the system tray to stop animating — that means the engine is ready.
3. **Settings → General → "Use the WSL 2 based engine"** must be checked.
4. **Settings → Resources → WSL Integration** — enable for your default distro.

### 3. Verify

```powershell
docker --version
docker run --rm hello-world
```

`hello-world` should print "Hello from Docker!" If it errors with "engine not running", launch Docker Desktop and wait.

---

## Installing PostgreSQL via Docker

You need **two databases**: `workload_dev` (the app) and `workload_test` (pytest). The repo ships `docker-compose.dev.yml`, which boots Postgres 15 and auto-creates both via `backend/scripts/init-db.sh`.

### 1. Start the database container

From the repo root:

```powershell
docker compose -f docker-compose.dev.yml up -d
```

This pulls `postgres:15-alpine` (first time only), creates a named volume `workload_pgdata` for persistence, and starts a container named `workload_postgres` on port `5432`.

### 2. Verify it's running

```powershell
docker compose -f docker-compose.dev.yml ps
docker exec -it workload_postgres psql -U workload -d workload_dev -c "\l"
```

You should see `workload_dev` and `workload_test` in the database list.

### Connection details

| | |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| User | `workload` |
| Password | `workload` |
| Databases | `workload_dev`, `workload_test` |

### Common Docker operations

```powershell
# stop (keep data)
docker compose -f docker-compose.dev.yml down

# stop + wipe all data
docker compose -f docker-compose.dev.yml down -v

# tail logs
docker compose -f docker-compose.dev.yml logs -f postgres

# open a psql shell inside the container
docker exec -it workload_postgres psql -U workload -d workload_dev

# list databases / tables from inside psql
\l
\dt
\q                          # quit psql
```

### (Optional) Native PostgreSQL install on Windows

If you'd rather not use Docker, install the official EnterpriseDB Windows installer:

```powershell
winget install --id PostgreSQL.PostgreSQL.15
```

Then create the role and databases (run in PowerShell — `psql` is on `PATH` after install):

```powershell
# you'll be prompted for the postgres superuser password set during install
psql -U postgres -c "CREATE USER workload WITH PASSWORD 'workload' CREATEDB;"
psql -U postgres -c "CREATE DATABASE workload_dev OWNER workload;"
psql -U postgres -c "CREATE DATABASE workload_test OWNER workload;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE workload_dev  TO workload;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE workload_test TO workload;"
```

Verify:

```powershell
psql -h localhost -U workload -d workload_dev -c "SELECT version();"
```

---

## Backend (FastAPI)

### 1. Create the virtualenv

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> If PowerShell blocks the script with **"running scripts is disabled on this system"**, run once:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
> Then re-run the `Activate.ps1` line. In `cmd.exe` use `.\.venv\Scripts\activate.bat` instead.

### 2. Install Python dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

This installs FastAPI, SQLAlchemy 2.x async, Alembic, asyncpg, psycopg2-binary, python-jose (JWT), passlib + bcrypt, slowapi, pytest, etc.

### 3. Configure environment variables

Copy the example file:

```powershell
copy .env.example .env
```

The defaults work against the Docker Postgres above. Key variables:

```env
DATABASE_URL=postgresql+asyncpg://workload:workload@localhost:5432/workload_dev
DATABASE_URL_SYNC=postgresql+psycopg2://workload:workload@localhost:5432/workload_dev
TEST_DATABASE_URL=postgresql+asyncpg://workload:workload@localhost:5432/workload_test
TEST_DATABASE_URL_SYNC=postgresql+psycopg2://workload:workload@localhost:5432/workload_test

JWT_SECRET=dev-secret-change-me-in-production-please
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Set true to seed the 6 test accounts (admin@, hr.manager@, eng.manager@, frontend.lead@, qa.lead@, developer1@)
SEED_USERS=true

CORS_ORIGINS=http://localhost:4200
```

Generate a strong JWT secret for production:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Run database migrations (creates all tables)

Alembic reads the URL from `.env` via `app.core.config`. Apply every migration to bring an empty database to the latest schema:

```powershell
# still inside backend\ with the venv active
alembic upgrade head
```

This runs the three migrations in order:

| Revision | What it does |
|---|---|
| `7b82b69f7bac_initial_schema.py` | Creates every table: `users`, `roles`, `teams`, `projects`, `activity_types`, `project_categories`, `non_project_categories`, `self_imp_categories`, `task_types`, `workload_entries`, `expected_working_days`, `refresh_tokens`, etc. (with FKs, indexes, and CHECK constraints for `status` / `complexity`) |
| `80eb395bb86c_seed_lookups.py` | Seeds reference data: roles, teams, activity types (IDs 1=PROJECT, 2=NON_PROJECT, 3=SELF_IMP), default categories, task types |
| `16ff16a147eb_seed_users_dev_only.py` | Seeds the 6 test accounts — **only runs when `SEED_USERS=true`** |

Useful Alembic commands:

```powershell
alembic current              # show current revision
alembic history              # list all revisions
alembic downgrade -1         # roll back one migration
alembic downgrade base       # drop everything Alembic created
alembic upgrade head         # re-apply
```

If you ever need to start over from scratch:

```powershell
# Docker: wipe the volume
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
alembic upgrade head

# Native install: drop & recreate
psql -U postgres -c "DROP DATABASE workload_dev;"
psql -U postgres -c "CREATE DATABASE workload_dev OWNER workload;"
alembic upgrade head
```

### 5. Run the backend

```powershell
# from backend\ with the venv active
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Swagger UI: `http://localhost:8000/docs`. Leave this window running.

### 6. Run backend tests (optional)

Open a second PowerShell window, activate the venv, and:

```powershell
pytest                            # all tests
pytest -v                         # verbose
pytest app\tests\test_auth.py     # one file (note the backslash)
```

Tests use the `workload_test` database.

---

## Frontend (Angular v20)

### 1. Install Node dependencies

Open a **new** PowerShell window (so you're not inside the backend venv) and:

```powershell
cd test-app\frontend
npm install
```

This installs Angular 20 (standalone + signals), chart.js, ng2-charts, html2canvas, lucide-angular, and the dev toolchain (Angular CLI, Karma, Jasmine, TypeScript).

### 2. Configure the API URL

`src\environments\environment.ts` (dev) defaults to:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',
  showSeedAccountsHint: true,
};
```

Edit if your backend runs on a different host/port. `environment.prod.ts` is used for production builds.

### 3. Run the dev server

```powershell
npm start            # = ng serve, port 4200 with live reload
```

Open `http://localhost:4200`. Log in with any of the seeded accounts (see [CLAUDE.md](CLAUDE.md)) — the login screen also shows them under the amber hint toggle when `SEED_USERS=true`.

### 4. Build for production

```powershell
npm run build        # outputs to dist\frontend
```

### 5. Run frontend tests (optional)

```powershell
npm test                                                # interactive (Chrome)
npm test -- --watch=false --browsers=ChromeHeadless     # CI
```

---

## Quick Start with Docker Compose (full stack)

If you want everything running in containers at once (Postgres + backend + frontend Nginx) without installing Python / Node natively, use the production-style compose file:

```powershell
# from repo root — set required env vars first (PowerShell syntax)
$env:JWT_SECRET = (python -c "import secrets; print(secrets.token_hex(32))")
$env:SEED_USERS = "true"
$env:CORS_ORIGINS = "http://localhost"
$env:WEB_PORT = "80"

docker compose up --build -d
```

> In `cmd.exe` use `set JWT_SECRET=...` instead of `$env:JWT_SECRET = ...`.

Services started:

| Container | Image | Purpose |
|---|---|---|
| `workload_db` | postgres:15-alpine | Database |
| `workload_api` | built from `backend/Dockerfile` | FastAPI — auto-runs `alembic upgrade head` on startup |
| `workload_web` | built from `frontend/Dockerfile` | Nginx serving the built Angular bundle on port `${WEB_PORT}` |

```powershell
docker compose ps
docker compose logs -f backend
docker compose down
docker compose down -v       # also wipe the database volume
```

App is then at `http://localhost` (whatever `WEB_PORT` you set).

---

## Verifying the Install

After everything is up:

| Check | Command / URL | Expected |
|---|---|---|
| Postgres reachable | `docker exec -it workload_postgres psql -U workload -d workload_dev -c "\dt"` | List of ~15 tables |
| Backend health | `curl http://localhost:8000/api/v1/health` (or open in browser) | `{"status":"ok"}` (200) |
| Swagger | `http://localhost:8000/docs` | OpenAPI UI |
| Frontend | `http://localhost:4200` | Login screen renders |
| Login flow | `admin@company.com` / `admin123` | Lands on dashboard |

> `curl` on Windows 10+ is `curl.exe` (genuine curl, not the PowerShell alias). If you see XML / weird formatting, you're hitting the alias — use `curl.exe http://...` explicitly or just open the URL in a browser.

---

## Troubleshooting

**Docker says "engine not running" / commands time out**
Open Docker Desktop from the Start menu and wait for the whale icon to stop animating. On first install you may need to sign out and back in for WSL integration to take effect.

**`docker compose` not recognised**
Use `docker-compose` (older syntax) if you installed the legacy plugin, or update Docker Desktop — modern Docker bundles `compose` as a subcommand.

**`.\.venv\Scripts\Activate.ps1 cannot be loaded because running scripts is disabled`**
PowerShell execution policy. Run once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**`alembic upgrade head` fails with "could not connect to server"**
The database isn't running, or `DATABASE_URL_SYNC` in `.env` is wrong. Confirm the container is up:
```powershell
docker compose -f docker-compose.dev.yml ps
docker exec -it workload_postgres psql -U workload -d workload_dev -c "SELECT 1;"
```

**`asyncpg.InvalidPasswordError`**
The role's password doesn't match `.env`. Reset it:
```powershell
docker exec -it workload_postgres psql -U postgres -c "ALTER USER workload PASSWORD 'workload';"
```

**Login returns 401 even with seeded accounts**
You ran migrations with `SEED_USERS=false`. Set `SEED_USERS=true` in `backend\.env`, then:
```powershell
alembic downgrade base
alembic upgrade head
```

**CORS errors in the browser console**
Add the frontend origin to `CORS_ORIGINS` in `backend\.env` (comma-separated) and restart uvicorn.

**Port 4200 / 8000 / 5432 already in use**
Find the offending PID and stop it, or change the port. To find what's holding a port in PowerShell:
```powershell
Get-NetTCPConnection -LocalPort 5432 | Select-Object OwningProcess
Get-Process -Id <pid>          # see the process name
Stop-Process -Id <pid>         # kill it (use with care)
```
Or change ports: `uvicorn app.main:app --reload --port 8001`, `ng serve --port 4201`, and edit the host-side port in `docker-compose.dev.yml`.

**`alembic` can't find a revision**
Make sure you're running it from `backend\` (where `alembic.ini` lives) with the venv active.

**Long path / "file name too long" errors during `npm install`**
Enable long paths in Windows once:
```powershell
# PowerShell as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```
Then re-run `npm install`.

**Antivirus or Windows Defender slows down `npm install` / Docker**
Exclude the project folder and the Docker WSL data path (`%LOCALAPPDATA%\Docker\wsl`) from real-time scanning.

**Frontend fails to load fonts / icons**
Network/firewall blocking Google Fonts. The app degrades gracefully — letters render in the system fallback font.
