# Workload Tracking Application

Internal web application for a 20–50 person company to log daily workload by category and produce monthly/yearly reports.

## Stack

- **Backend** — Python 3.12+ / FastAPI / SQLAlchemy 2.x (async) / Alembic / PostgreSQL 15+
- **Frontend** — Angular v20 (standalone components, signals)
- **Auth** — JWT (email + password, bcrypt-hashed)

## Folder layout

```
/backend     FastAPI app + Alembic migrations
/frontend    Angular v20 SPA
/mockup      React mock prototype (reference, do not edit)
/docs        CLAUDE.md (project guide), TASK.md (development plan)
```

## Quick start (development)

For a detailed Windows walkthrough, see [installation.md](installation.md).

### 1) Bring up Postgres in Docker (creates workload_dev + workload_test)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2) Backend

**macOS / Linux**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head                    # runs all migrations + seeds
uvicorn app.main:app --reload --port 8000
```

**Windows (PowerShell)**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head                    # runs all migrations + seeds
uvicorn app.main:app --reload --port 8000
```

### 3) Frontend (new terminal)

```bash
cd frontend
npm install
npm start                               # http://localhost:4200
```

Then open `http://localhost:4200/login` and sign in with one of the seeded test accounts.

## Test accounts (dev only — seeded when `SEED_USERS=true`)

| Email                       | Password   | Role           |
|-----------------------------|------------|----------------|
| admin@company.com           | admin123   | ADMIN          |
| hr.manager@company.com      | hr123      | HR             |
| eng.manager@company.com     | mgr123     | MANAGER        |
| frontend.lead@company.com   | tl123      | TECH_LEAD      |
| qa.lead@company.com         | qa123      | QA_SPECIALIST  |
| developer1@company.com      | pass123    | WORKER         |

## Running tests

```bash
# Backend (57 pytest cases against a real Postgres)
cd backend && pytest

# Frontend (Karma + ChromeHeadless)
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
```

## Production deployment (Docker Compose)

```bash
cp .env.example .env                    # fill in JWT_SECRET, POSTGRES_PASSWORD, CORS_ORIGINS
docker compose up -d --build            # builds backend + frontend images, starts postgres
```

The frontend container exposes port 80 (`WEB_PORT` overridable) and reverse-proxies
`/api/` to the backend over the internal network. The backend runs `alembic upgrade head`
on startup and serves `0.0.0.0:8000` inside the compose network.

**Production checklist:**

- Generate a strong `JWT_SECRET` (`python -c 'import secrets; print(secrets.token_urlsafe(48))'`).
- Set `SEED_USERS=false` (default) so test accounts are not created in production.
- Set `CORS_ORIGINS` to the public URL of your frontend (no trailing slash).
- Tune `LOGIN_RATE_LIMIT` for your traffic (default `10/minute` per IP).
- Schedule `pg_dump` backups against the `postgres` container's volume.
- Front the nginx container with TLS (e.g. via a reverse-proxy or Cloudflare).

## API documentation

The backend serves an OpenAPI / Swagger UI at:

- Development: `http://localhost:8000/docs`
- Production:  `http://<your-domain>/api/v1/docs` (proxied through nginx)

## Mock prototype

See [mockup/workload-app.jsx](mockup/workload-app.jsx) for the original React mock.
The Angular implementation tracks the mock's behavior and visual language; the mock
itself is **read-only** reference material and is not built or deployed.

## Documentation

- [docs/CLAUDE.md](docs/CLAUDE.md) — project guide and conventions
- [docs/TASK.md](docs/TASK.md) — phase-by-phase development plan
- [CHANGELOG.md](CHANGELOG.md) — what landed in each phase

## Smoke test (after both servers are up)

1. Login as `admin@company.com / admin123` → dashboard org tree appears.
2. **Workload entry** → fill the form, submit, see the daily summary update.
3. **Workload list** → see the entry, run a date-range preset, export CSV.
4. **Yearly report** → see the matrix populate, expand a row to view the activity breakdown, edit working days.
5. **Users** → create a worker, deactivate it, reactivate it.
6. **Yönetim** → on the project-categories tab, add a new category with a custom color.
7. Logout from the avatar popover, return to the login screen.
