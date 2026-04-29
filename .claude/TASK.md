# TASK.md

Workload Tracking Application — step-by-step development plan. The mock prototype (`/mockup/workload-app.jsx`) is complete; the conversion to a real app starts now.

**How to work:** when a phase is finished, move on to the next one. Tasks within a phase are sequential — finish each one and check it off.

---

## Phase 1 — Setup & Infrastructure

### 1.1 Repository and folder structure
- [ ] git repo init
- [ ] Create `/backend`, `/frontend`, `/mockup`, `/docs` folders
- [ ] Move `/mockup/workload-app.jsx` (the mock) into place (for reference)
- [ ] Place `/docs/CLAUDE.md` and `/docs/TASK.md`
- [ ] `.gitignore` (Python, Node, IDE)
- [ ] Root `README.md` (project overview, setup commands)

### 1.2 PostgreSQL setup
- [ ] PostgreSQL 15+ available locally
- [ ] Create `workload_dev` and `workload_test` databases
- [ ] Document connection strings in `.env.example`

### 1.3 Backend skeleton (FastAPI)
- [ ] `cd backend && python -m venv venv`
- [ ] `requirements.txt` (fastapi, uvicorn, sqlalchemy, alembic, asyncpg, psycopg2-binary, pydantic[email], pydantic-settings, python-jose[cryptography], passlib[bcrypt], python-multipart, pytest, pytest-asyncio, httpx)
- [ ] File layout: `app/{api/v1, core, models, schemas, services, tests}`
- [ ] `app/main.py` — FastAPI app, CORS middleware, health check (`GET /health`)
- [ ] `app/core/config.py` — Pydantic Settings (DATABASE_URL, JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, SEED_USERS, CORS_ORIGINS)
- [ ] `app/core/database.py` — async engine, AsyncSession, get_db dependency
- [ ] `.env.example` and `.env` (gitignored)
- [ ] `alembic init alembic`; configure `alembic.ini` and `env.py` to work with the async session
- [ ] Verify `uvicorn app.main:app --reload` runs (`/health` returns 200)

### 1.4 Frontend skeleton (Angular v20)
- [ ] `npx @angular/cli@latest new frontend --routing --style=css --standalone`
- [ ] Folder layout: `src/app/{core, features, shared}`
- [ ] `core/services/auth.service.ts` (empty skeleton)
- [ ] `core/interceptors/auth.interceptor.ts` (empty skeleton)
- [ ] `core/guards/auth.guard.ts` (empty skeleton)
- [ ] `app.config.ts` — provideHttpClient + interceptors, provideRouter
- [ ] `app.routes.ts` — lazy routes (login, dashboard, workload-entry, workload-list, yearly-report, users, lookups)
- [ ] `environments/environment.ts` (apiUrl: `http://localhost:8000/api/v1`)
- [ ] Verify `npm start` runs the dev server (port 4200)

---

## Phase 2 — Database Schema & Migrations

### 2.1 Initial migration (lookup tables + roles + teams)
- [ ] `alembic revision -m "initial schema"`
- [ ] Tables:
  - `roles` (id, code UNIQUE, name, description, created_at)
  - `teams` (id, name, description, is_active, created_at, updated_at)
  - `activity_types` (id, code UNIQUE, name, description, is_active, created_at, updated_at)
  - `projects` (id, code UNIQUE, name, description, is_active, created_at, updated_at)
  - `task_types` (id, code UNIQUE, name, is_active, created_at, updated_at)
  - `project_categories` (id, code UNIQUE, name, color, is_active, created_at, updated_at)
  - `non_project_categories` (id, code UNIQUE, name, color, is_active, created_at, updated_at)
  - `self_imp_categories` (id, code UNIQUE, name, color, is_active, created_at, updated_at)
- [ ] All `code` columns must satisfy the regex `^[A-Z0-9_-]+$` (CHECK constraint optional, app-level validation is enough)

### 2.2 Users migration
- [ ] `users` table:
  ```
  id BIGSERIAL PK
  account_id VARCHAR(20) UNIQUE NOT NULL  -- e.g. 'EMP001'
  email VARCHAR(255) UNIQUE NOT NULL
  name VARCHAR(255) NOT NULL
  password_hash VARCHAR(255) NOT NULL  -- bcrypt
  is_active BOOLEAN NOT NULL DEFAULT true
  position VARCHAR(255)
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
  team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL
  manager_account_id VARCHAR(20) REFERENCES users(account_id) ON DELETE SET NULL  -- self-FK
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ```
- [ ] Indexes: `account_id`, `email`, `manager_account_id`, `(role_id, is_active)`

### 2.3 Workload entries migration
- [ ] `workload_entries` table:
  ```
  id BIGSERIAL PK
  account_id VARCHAR(20) NOT NULL REFERENCES users(account_id) ON DELETE RESTRICT
  work_date DATE NOT NULL
  activity_type_id BIGINT NOT NULL REFERENCES activity_types(id) ON DELETE RESTRICT
  category_id BIGINT NOT NULL  -- references one of 3 different tables; FK enforced at app level
  project_id BIGINT REFERENCES projects(id) ON DELETE RESTRICT  -- nullable
  task_type_id BIGINT NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT
  task_description TEXT NOT NULL
  status VARCHAR(20) NOT NULL CHECK (status IN ('ongoing','completed','blocked'))
  complexity VARCHAR(20) NOT NULL CHECK (complexity IN ('low','medium','high'))
  quantity INTEGER  -- nullable
  hours_spent NUMERIC(5,2) NOT NULL CHECK (hours_spent > 0)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  
  CHECK (
    (activity_type_id = 1 AND project_id IS NOT NULL) OR
    (activity_type_id IN (2, 3) AND project_id IS NULL)
  )
  ```
- [ ] Indexes: `(account_id, work_date)`, `work_date`, `project_id`, `(activity_type_id, category_id)`

### 2.4 Expected working days migration
- [ ] `expected_working_days` table:
  ```
  id BIGSERIAL PK
  year INTEGER NOT NULL
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12)
  working_days INTEGER NOT NULL CHECK (working_days BETWEEN 0 AND 31)
  updated_by_account_id VARCHAR(20) REFERENCES users(account_id)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (year, month)
  ```

### 2.5 Seed migration
- [ ] New migration: insert into `roles` (6 rows, with the codes from the mock)
- [ ] Insert into `teams` (Engineering, Product, Design, QA, DevOps, Marketing)
- [ ] Insert into `activity_types` (id=1 PROJECT, id=2 NON_PROJECT, id=3 SELF_IMP — set IDs explicitly!)
- [ ] Insert into `projects`, `task_types`, and the 3 category tables — using the defaults from the mock
- [ ] This seed should run in every environment (the basic lookup data is required in production too).
- [ ] **SEPARATE migration:** `seed_users` — should only run when the env var `SEED_USERS=true` is set (test accounts from the mock with bcrypt-hashed passwords). Must not run in production.

### 2.6 Migration tests
- [ ] `alembic upgrade head` runs cleanly on an empty DB
- [ ] `alembic downgrade -1` and re-`upgrade` works
- [ ] pytest fixture for the test DB: clean and seed before each test

---

## Phase 3 — Backend: Auth & Users

### 3.1 SQLAlchemy models
- [ ] `app/models/__init__.py` — Base class
- [ ] One model per table: `User`, `Role`, `Team`, `ActivityType`, `Project`, `TaskType`, `ProjectCategory`, `NonProjectCategory`, `SelfImpCategory`, `WorkloadEntry`, `ExpectedWorkingDay`
- [ ] Relationships: `User.role`, `User.team`, `User.manager` (self), `User.reports`, `WorkloadEntry.user`, `WorkloadEntry.activity_type`, etc.

### 3.2 Pydantic schemas
- [ ] `app/schemas/auth.py` — LoginRequest, TokenResponse, CurrentUser
- [ ] `app/schemas/user.py` — UserCreate, UserUpdate, UserOut, PasswordResetRequest
- [ ] `app/schemas/lookup.py` — Generic CRUD schemas (one base shared by all lookups)
- [ ] `app/schemas/workload.py` — WorkloadEntryCreate, WorkloadEntryUpdate, WorkloadEntryOut
- [ ] `app/schemas/report.py` — YearlyReportRow (with breakdown)

### 3.3 Security utilities
- [ ] `app/core/security.py`:
  - `hash_password(plain) -> str` (bcrypt)
  - `verify_password(plain, hashed) -> bool`
  - `create_access_token(data, expires_delta) -> str` (JWT)
  - `decode_token(token) -> dict`

### 3.4 Auth endpoints
- [ ] `POST /api/v1/auth/login` (email + password → access_token, user info)
  - Inactive user → 401
  - Wrong password → 401 (timing-safe comparison)
- [ ] `POST /api/v1/auth/logout` (no-op; the frontend just deletes the token — optional)
- [ ] `GET /api/v1/auth/me` (current user info — from the JWT)
- [ ] Dependency: `get_current_user(token: str = Depends(oauth2_scheme))` for every protected endpoint
- [ ] Dependency: `require_role(*allowed_codes)` for role-based authorization

### 3.5 Users CRUD
- [ ] `GET /api/v1/users` — list with filters (role, team, is_active, search)
  - WORKER cannot access this endpoint (403)
  - Default filter: `is_active=true`
- [ ] `GET /api/v1/users/{id}` — single user
- [ ] `POST /api/v1/users` — new user (admin / manager / tech_lead / QA / hr — together with the password)
  - Verify account_id is unique
  - Verify email is unique
  - If manager_account_id is provided, verify the target user is active
  - **Hierarchy validation:** a WORKER's manager must be an EM (role check)
- [ ] `PATCH /api/v1/users/{id}` — partial update
  - account_id cannot be changed
  - Email change goes through uniqueness check
  - A user cannot deactivate themselves
- [ ] `POST /api/v1/users/{id}/reset-password` — ADMIN only
  - Hash the new password
  - Audit log optional
- [ ] `DELETE /api/v1/users/{id}` — soft delete (is_active=false)
  - A user cannot delete themselves
  - A manager with active reports cannot be deleted (reassign their reports' manager first)
- [ ] `POST /api/v1/users/{id}/activate` — undo soft delete

### 3.6 Auth & users tests
- [ ] Login: correct credentials → 200 + token
- [ ] Login: wrong password → 401
- [ ] Login: inactive user → 401
- [ ] /me is protected, requires a token
- [ ] User CRUD happy path
- [ ] Hierarchy violation → 400 (a worker cannot have another worker as manager)
- [ ] Worker cannot access /users (403)

---

## Phase 4 — Backend: Lookups & Workload

### 4.1 Lookup endpoints (generic pattern per table)
- [ ] `GET / POST / PATCH / DELETE / POST(activate)` — projects, activity_types, task_types, project_categories, non_project_categories, self_imp_categories
- [ ] WORKER cannot write to any of them, can only read (where needed)
- [ ] Soft delete (is_active=false)
- [ ] Code is immutable (cannot be changed via PATCH)
- [ ] Code regex validation: `^[A-Z0-9_-]+$`
- [ ] Usage-count endpoint: `GET /api/v1/projects/{id}/usage` → how many workload entries use it (so the frontend can show this before deletion)

### 4.2 Workload entry endpoints
- [ ] `GET /api/v1/workload-entries` — list with filters
  - Filters: account_id, date_from, date_to, project_id, activity_type_id, task_type_id, status, complexity, search (description)
  - WORKER **can view** every entry in the company (read-only) — this is on the listings screen
  - Pagination: `?page=1&page_size=50` (max 200)
  - Sort: `?sort=work_date&dir=desc`
- [ ] `POST /api/v1/workload-entries` — new entry
  - **Validation (critical):**
    - work_date must be within the last 30 days (future dates are also forbidden — only today or past)
    - hours_spent > 0
    - If activity_type=1, project_id is required; otherwise it must be NULL
    - category_id must exist in the appropriate category table (depending on activity_type)
  - account_id is taken from the current user (it is overridden even if sent in the body — **no one can submit on someone else's behalf**, not even ADMIN)
- [ ] `PATCH /api/v1/workload-entries/{id}` — update
  - A user can only edit their own entry (even ADMIN cannot edit someone else's entry — this is company policy, enforce it)
  - Enforce the 30-day edit window
- [ ] `DELETE /api/v1/workload-entries/{id}` — hard delete
  - Same rules
- [ ] `GET /api/v1/workload-entries/export` — CSV export (with filters)

### 4.3 Yearly report endpoint
- [ ] `GET /api/v1/reports/yearly?year=2026&team_id=1&project_id=3&search=&include_breakdown=true`
- [ ] Response shape:
  ```json
  {
    "year": 2026,
    "expected_working_days": [22, 20, 22, ..., 22],
    "year_target_hours": 2112,
    "rows": [
      {
        "user": { "account_id": "EMP001", "name": "...", "team": "Engineering" },
        "hours_by_month": [178.5, 165.0, ..., 195.0],
        "year_total": 2243.5,
        "breakdown_by_activity": {
          "1": [145.0, ...],   // Project Activity
          "2": [18.0, ...],    // Non-Project
          "3": [15.5, ...]     // Self Imp
        }
      }
    ],
    "column_totals": [...],
    "grand_total": 18420.5
  }
  ```
- [ ] WORKER cannot access this endpoint (403)
- [ ] When include_breakdown=false the breakdown field is empty (for performance)

### 4.4 Working days endpoint
- [ ] `GET /api/v1/working-days?year=2026` → 12-element array (default 22 for missing months)
- [ ] `PATCH /api/v1/working-days?year=2026` body: `{ months: [22, 20, ...] }`
  - Only ADMIN, MANAGER, TECH_LEAD, QA_SPECIALIST
  - HR is read-only
  - Upsert: update if exists, insert otherwise

### 4.5 Backend tests
- [ ] Workload create/update happy path
- [ ] 30-day edit window: 31 days ago → 400
- [ ] Future date → 400
- [ ] activity=PROJECT but project_id is null → 400
- [ ] activity=NON_PROJECT but project_id is set → 400
- [ ] Yearly report: with known seed data, returns the correct hours_by_month
- [ ] Worker tries to update an entry that isn't theirs → 403
- [ ] Working days update: HR user → 403

---

## Phase 5 — Frontend: Auth & Layout

### 5.1 Auth service & guard
- [ ] `core/services/auth.service.ts`:
  - `login(email, password)` → POST /auth/login, save token to localStorage
  - `logout()` → clear token, redirect to /login
  - `getCurrentUser()` → signal<CurrentUser | null>
  - `getToken()` → string | null
  - `hasRole(role: string): boolean`
- [ ] `core/interceptors/auth.interceptor.ts` → add Authorization header, log out on 401
- [ ] `core/guards/auth.guard.ts` → if no token, redirect to /login
- [ ] `core/guards/role.guard.ts` → role-based access control

### 5.2 Login screen
- [ ] `features/auth/login.component.ts` (a 1:1 copy of the mock's LoginScreen UI)
- [ ] Form: email + password (Reactive Forms)
- [ ] Submit → AuthService.login → on success: redirect to dashboard; on failure: show error
- [ ] Mock test accounts expander (only in the dev environment)

### 5.3 App shell (TopNav)
- [ ] `shared/components/top-nav.component.ts` (1:1 with the mock's TopNav)
- [ ] Role-based menu (take `MENU_BY_ROLE` from the mock)
- [ ] Logout button, user avatar + name
- [ ] Active route highlight

### 5.4 Routing
- [ ] `app.routes.ts`:
  ```ts
  /login                          (no guard)
  /                               (auth guard, redirects to /dashboard)
  /dashboard                      (auth guard)
  /workload-entry                 (auth guard)
  /workload-list                  (auth guard)
  /yearly-report                  (role guard: not WORKER)
  /users                          (role guard: not WORKER)
  /lookups                        (role guard: not WORKER)
  ```

---

## Phase 6 — Frontend: Workload Entry & Listings

### 6.1 Lookup service
- [ ] `core/services/lookup.service.ts`:
  - signals: activityTypes, projectCategories, nonProjCategories, selfImpCategories, projects, taskTypes
  - `loadAll()` — fetch them all in one go (during app initialization)
  - `getCategoriesForActivity(activityTypeId): Category[]`
  - `findCategory(activityTypeId, categoryId): Category | undefined`

### 6.2 Workload entry page
- [ ] `features/workload-entry/workload-entry.component.ts`
- [ ] Match the mock's form layout 1:1:
  - Date picker (Today shortcut)
  - Activity Type segmented control (full width)
  - Category dropdown (filtered by activity)
  - Project dropdown (only when activity=Project)
  - Task type, Hours, Description, Status, Complexity, Quantity
  - Submit / Cancel buttons
- [ ] Right panel: today's total hours + entry list (own entries)
- [ ] 30-day lock indicator
- [ ] Edit mode (when an entry is selected, load it into the form)

### 6.3 Workload list page
- [ ] `features/workload-list/workload-list.component.ts`
- [ ] Filter bar (top): date range + presets + search + 6 multi-select dropdowns
- [ ] KPI cards (4 metrics)
- [ ] 3 charts (Trend area, Project donut, Activity bar) — use ng2-charts or ngx-charts instead of Recharts
- [ ] Sortable table + pagination (20/50/100)
- [ ] CSV export button

### 6.4 Workload entry/list tests
- [ ] Form submit happy path
- [ ] When activity type changes, the category dropdown resets
- [ ] Project field is hidden when activity=non-project
- [ ] List filter: date range = 7 days → only that range is shown
- [ ] Edit/delete buttons are not shown to a Worker on the list

---

## Phase 7 — Frontend: Reports & Admin

### 7.1 Yearly report page
- [ ] `features/yearly-report/yearly-report.component.ts`
- [ ] Year selector + team filter + project filter + search
- [ ] 4 KPI cards (Target, Total entries, Average, Fill rate)
- [ ] Color legend
- [ ] Matrix table:
  - Sticky left column (User)
  - 12 month columns + Total
  - Color rule (1:1 from the mock)
  - Expand/collapse on each row (+/×)
  - When expanded: activity breakdown (3 rows, indented, no color)
  - Global expand-all toggle in the header
- [ ] Working-days editor modal (3x4 grid, role-based read-only)
- [ ] Excel export button (breakdown included)

### 7.2 Users page
- [ ] `features/users/users.component.ts`
- [ ] Split view: table (left) + detail panel (right)
- [ ] Filter: role, team, status (default active)
- [ ] Form fields: account_id (read-only on edit), email, name, password (create only), position, role, team, manager (excluding self/inactive)
- [ ] Save (when dirty), Password reset (admin-only modal), Soft delete, Reactivate
- [ ] Toast notifications

### 7.3 Lookups (Management) page
- [ ] `features/lookups/lookups.component.ts`
- [ ] 6 tabs: projects, activity_types, project_categories, non_project_categories, self_imp_categories, task_types
- [ ] Each tab: table + filter (search + active/inactive)
- [ ] Modal create/edit (LookupModal — 1:1 from the mock)
- [ ] Code regex validation, color picker (in category tabs)
- [ ] Soft delete + usage warning + reactivate

### 7.4 Dashboard (org tree)
- [ ] `features/dashboard/dashboard.component.ts`
- [ ] Vertical org tree (Director → HEM → EM → leaf list)
- [ ] OrgNode recursive component
- [ ] Branch nodes in the tree, leaf nodes in a 2-column list under their parent
- [ ] Project badges (projects active this month)
- [ ] Right panel: HR + QA Specialist (grouped by role)

---

## Phase 8 — Polish & Production Prep

### 8.1 Error handling
- [ ] Backend: global exception handler (ValidationError → 400, NotFound → 404, etc.)
- [ ] Frontend: global error interceptor → toast/banner
- [ ] Network error handling (offline state)

### 8.2 Logging
- [ ] Backend: structlog or loguru, JSON format
- [ ] Request/response log middleware (redact sensitive data)
- [ ] Frontend: console.error disabled in production

### 8.3 Security hardening
- [ ] Rate-limit the login endpoint (slowapi or similar)
- [ ] Restrict CORS to the production origin
- [ ] HTTPS only (production)
- [ ] CSP header
- [ ] JWT refresh token flow (optional but recommended)

### 8.4 Performance
- [ ] Optimize the yearly report endpoint (single SQL query, GROUP BY year/month)
- [ ] Pagination is mandatory for workload entries (max limit 200)
- [ ] Verify lazy loading is enabled for every frontend feature
- [ ] Cache lookups (they change rarely)

### 8.5 Deployment
- [ ] Docker Compose: postgres + backend + frontend nginx
- [ ] Backend Dockerfile (multi-stage: build + runtime)
- [ ] Frontend Dockerfile (build + nginx serve)
- [ ] CI: lint + test + build (GitHub Actions YAML)
- [ ] Document production environment variables separately
- [ ] Backup strategy (postgres pg_dump cron)

### 8.6 Documentation
- [ ] API docs auto-generated (FastAPI Swagger UI at `/docs`)
- [ ] Production deployment instructions in the README
- [ ] Start a CHANGELOG.md

---

## Notes

- **Do not modify the mock prototype.** If a feature is confusing, look at the mock; do not change the mock as a workaround.
- **At the end of every phase**, verify the frontend and backend work together (login → dashboard → create an entry → see it in listings).
- **Test coverage** target: backend 80%+, critical frontend components 60%+.
- **Keep migrations reversible.** Write a meaningful `downgrade()` for every `upgrade()`.
- **Never log user passwords.** Minimum bcrypt cost factor = 12.
- **Hierarchy validation** must run on both backend and frontend (frontend for UX, backend for safety).

---

## Quick Smoke Test (run at the end of every phase)

```bash
# Backend
cd backend && pytest && uvicorn app.main:app --reload

# Frontend (in a new terminal)
cd frontend && npm test -- --watch=false && npm start
```

Then in the browser:
1. Login: admin@company.com / admin123 → Dashboard loads
2. Workload entry: add an entry → success toast
3. Workload list: see the new entry in the list
4. Yearly report: hours for that month appear in the matrix
5. Users: add a new user, deactivate, reactivate
6. Management → Activity Types → add a new type
7. Logout → return to the login screen
