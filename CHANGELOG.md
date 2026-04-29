# Changelog

All notable changes to this project will be documented here.
The project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) once a 1.0 release is cut.

## [Unreleased] — 2026-04-29

### Phase 1 — Setup & Infrastructure
- Repository scaffold (`backend/`, `frontend/`, `docs/`, `mockup/`).
- `docker-compose.dev.yml` with PostgreSQL 15 (`workload_dev`, `workload_test`).
- FastAPI skeleton with async SQLAlchemy 2.x and `/health` + `/health/db` endpoints.
- Angular v20 SPA with standalone components, signals, and lazy routes.
- Auth guard, role guard, JWT interceptor, snake_case ↔ camelCase interceptor.

### Phase 2 — Database & Migrations
- Eleven SQLAlchemy models (`roles`, `teams`, `activity_types`, `projects`,
  `task_types`, three category tables, `users` with self-FK, `workload_entries`
  with project-consistency CHECK, `expected_working_days`).
- Alembic migrations: initial schema, lookup seeds (stable activity IDs 1/2/3),
  env-guarded `seed_users` migration with bcrypt-hashed test accounts.
- Six migration sanity tests.

### Phase 3 — Backend Auth & Users
- JWT helpers (HS256, 8h expiry), bcrypt password hashing.
- `POST /auth/login` (timing-safe), `GET /auth/me`, `POST /auth/logout`.
- `get_current_user`, `require_role`, and `forbid_worker` dependencies.
- Users CRUD with hierarchy validation (Worker → MANAGER), uniqueness checks,
  self-deactivation guard, soft delete with active-reports check, ADMIN-only
  password reset, reactivate.
- Twenty backend tests for auth + users.

### Phase 4 — Backend Lookups, Workload, Reports, Working Days
- Generic CRUD service for the six lookup tables; per-resource routers with
  immutable `code`, soft delete, reactivate, usage-count.
- Workload entry endpoints with the 30-day edit window, owner-only mutation
  (ADMIN included), category↔activity validation, sortable+paginated list,
  CSV export.
- Yearly report endpoint backed by a single `GROUP BY` query with optional
  per-activity breakdown.
- Working-days endpoint (12-element array, default 22, role-gated edits).
- 31 additional backend tests (lookups, workload, working days, yearly report).

### Phase 5 — Frontend Auth & Layout
- Design tokens ported from the mock (`--c-*` CSS variables).
- Login screen 1:1 with the mock (radial-gradient backdrop, branding panel,
  login card, dev-mode seed accounts dropdown, error banner).
- TopNav with role-based menu (`MENU_BY_ROLE` mirrors the mock), profile
  popover, logout.
- App shell wires the TopNav into the authenticated layout.

### Phase 6 — Frontend Workload Entry & Listings
- Lookup service preloads activity types, projects, task types, and three
  category tables from the API on app start.
- Workload entry page: date picker with "Today" shortcut, 30-day lock banner,
  edit-mode banner, segmented activity control, filtered category dropdown,
  conditional project field, status/complexity segmented controls, daily
  summary with stacked bar, edit/delete on own entries.
- Workload list page: filter bar (date range + presets + multi-criteria
  dropdowns + search), four KPI cards, sortable + paginated table, CSV export
  via authenticated blob fetch.
- Three Angular unit tests covering the activity → category reset rule, the
  hidden-project-field rule, and form validity.

### Phase 7 — Frontend Reports & Admin
- Yearly report: filter row (year/team/project/search), four KPI cards, color
  legend, sticky-left matrix table, per-row expand/collapse for activity
  breakdown, working-days editor modal (3×4 grid, role-gated), CSV export.
- Users page: split view (filter+list / detail+form), role/team/status
  filters, hierarchy-aware manager picker, immutable `account_id` on edit,
  password reset modal (admin-only), soft delete + reactivate.
- Lookups (Yönetim) page: six tabs, modal create/edit with code-regex
  validation and a 10-color picker, soft delete + reactivate.
- Dashboard org tree: recursive nodes (HR/QA Specialist excluded from the
  tree, shown in side panels), branch nodes nested vertically with leaf
  nodes laid out as 2-column grids beneath their manager.

### Phase 8.7 — Listings page charts (post-Phase-8 follow-up)
- New backend endpoint `GET /api/v1/workload-entries/aggregates` returning
  three GROUP BY result sets (by_date with continuous date filling, by_project
  with project name joined in, by_activity with activity name joined in) plus
  totals. Mirrors every filter the list endpoint accepts.
- Four pytest cases for the aggregate endpoint (empty / project + activity
  group-by / missing-day fill / filter respect) — backend total is now **61**.
- Added `chart.js@4` and `ng2-charts@9` (with `@angular/cdk@20` peer dep) to
  the frontend.
- KPI cards on the listings page now read from the aggregate endpoint
  (full filtered set, not just the current page). New labels: `Toplam kayıt`,
  `Toplam saat`, `Aktif proje`, `Aktif gün ort.`
- Three charts wired up next to the KPIs: line chart (daily trend), doughnut
  (project share), horizontal bar (activity share). Mockup palette and color
  conventions retained.

### Phase 8 — Polish & Production Prep
- Backend global exception handlers (uniform JSON error envelope).
- Lightweight request/response logging middleware (skips `/health`,
  attaches `X-Request-ID`).
- slowapi-based per-IP rate limit on `POST /auth/login`
  (`LOGIN_RATE_LIMIT` env var, default 10/min).
- Frontend HTTP error interceptor + global toast/notification host.
- Backend Dockerfile (multi-stage Python + libpq runtime, runs migrations
  on startup, non-root user, healthcheck).
- Frontend Dockerfile (Node 22 build → nginx runtime) with a SPA-aware
  `nginx.conf` that proxies `/api/` to the backend container.
- Production `docker-compose.yml` (postgres + backend + frontend) with
  `.env.example` template.
- GitHub Actions CI: backend pytest against a Postgres service, frontend
  `ng test` + `ng build --configuration=production`, Docker image builds
  for both services.
