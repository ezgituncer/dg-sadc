"""Idempotent demo data seed — two example workers + their workload.

Recreates the demo dataset used during development so a fresh environment can be
populated in one step. Run AFTER the schema/lookups/RBAC are in place:

    cd backend
    alembic upgrade head            # schema + lookups + RBAC (always)
    python scripts/seed_demo.py     # this script (dev/demo only)

What it creates (idempotent — safe to re-run):
  * Hasan Deniz (worker)  -> April + May: realistic, varied hours (some days 8h+,
    some partial, a few empty days) so the calendar shows green/yellow/red.
  * Ipek Yagmur Kuzum (worker) -> May: every working day at the expected 8h
    (fully on-target).

Users are matched by email; each target month is cleared before refill, so
re-running never duplicates rows. DEV/DEMO ONLY — do not run against production.

The target year defaults to the current year; override with SEED_DEMO_YEAR.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

# Make `app` importable regardless of the current working directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import (  # noqa: E402
    NonProjectCategory,
    Project,
    ProjectCategory,
    Role,
    SelfImpCategory,
    TaskType,
    Team,
    User,
    WorkloadEntry,
)

YEAR = int(os.getenv("SEED_DEMO_YEAR", str(date.today().year)))
WORKER_PASSWORD = os.getenv("SEED_DEMO_PASSWORD", "pass123")
WORKER_ROLE_CODE = "WORKER"

# Demo workers (matched by email for idempotency).
HASAN = {"account_id": "EMP200", "email": "hasan.deniz@company.com", "name": "Hasan Deniz"}
IPEK = {"account_id": "EMP201", "email": "ipek.kuzum@company.com", "name": "Ipek Yagmur Kuzum"}

# Varied daily hours keyed by (day-of-month % 7); 0 leaves the day empty (red).
VARIED_HOURS = {0: 0, 1: 8, 2: 8, 3: 6, 4: 8, 5: 4, 6: 8.5}
DESCRIPTIONS = [
    "Feature gelistirme", "Bug fix ve test", "Code review", "API entegrasyonu",
    "UI iyilestirmeleri", "Refactoring", "Dokumantasyon", "Toplanti ve planlama",
]
STATUSES = ["completed", "completed", "ongoing", "completed", "blocked"]
COMPLEXITIES = ["low", "medium", "high", "medium", "high"]


def _month_days(year: int, month: int):
    d = date(year, month, 1)
    while d.month == month:
        yield d
        d += timedelta(days=1)


async def _refs(db):
    """Resolve valid FK ids at runtime so the seed adapts to whatever lookups exist."""
    return {
        "projects": list((await db.execute(select(Project.id).order_by(Project.id))).scalars()),
        "proj_cats": list((await db.execute(select(ProjectCategory.id).order_by(ProjectCategory.id))).scalars()),
        "nonproj_cats": list((await db.execute(select(NonProjectCategory.id).order_by(NonProjectCategory.id))).scalars()),
        "selfimp_cats": list((await db.execute(select(SelfImpCategory.id).order_by(SelfImpCategory.id))).scalars()),
        "tasks": list((await db.execute(select(TaskType.id).order_by(TaskType.id))).scalars()),
    }


async def _get_or_create_worker(db, info, role_id, team_id, manager_acc) -> str:
    existing = (await db.execute(select(User).where(User.email == info["email"]))).scalar_one_or_none()
    if existing is not None:
        return existing.account_id
    user = User(
        account_id=info["account_id"],
        email=info["email"],
        name=info["name"],
        password_hash=hash_password(WORKER_PASSWORD),
        is_active=True,
        role_id=role_id,
        position_id=None,
        team_id=team_id,
        manager_account_id=manager_acc,
    )
    db.add(user)
    await db.flush()
    print(f"  created worker {user.account_id} ({info['name']}) / {info['email']} / {WORKER_PASSWORD}")
    return user.account_id


async def _clear_month(db, account_id: str, year: int, month: int) -> None:
    start = date(year, month, 1)
    end = date(year + (month == 12), (month % 12) + 1, 1)
    await db.execute(
        delete(WorkloadEntry).where(
            WorkloadEntry.account_id == account_id,
            WorkloadEntry.work_date >= start,
            WorkloadEntry.work_date < end,
        )
    )


def _project_entry(acc, d, refs, i, hours, desc, status, cx):
    return WorkloadEntry(
        account_id=acc, work_date=d, activity_type_id=1,
        category_id=refs["proj_cats"][i % len(refs["proj_cats"])],
        project_id=refs["projects"][i % len(refs["projects"])],
        task_type_id=refs["tasks"][i % len(refs["tasks"])],
        task_description=desc, status=status, complexity=cx,
        quantity=None, hours_spent=Decimal(str(hours)),
    )


def _build_varied(acc, year, month, refs, start_i):
    """Mixed hours across the month -> green/yellow/red days in the calendar."""
    entries, i = [], start_i
    for d in _month_days(year, month):
        if d.weekday() >= 5:
            continue
        total = VARIED_HOURS[d.day % 7]
        if total <= 0:
            continue  # empty working day -> red
        desc = DESCRIPTIONS[i % len(DESCRIPTIONS)]
        status = STATUSES[i % len(STATUSES)]
        cx = COMPLEXITIES[i % len(COMPLEXITIES)]
        if total > 6:
            entries.append(_project_entry(acc, d, refs, i, 6, desc, status, cx))
            rest = Decimal(str(total - 6))
            if i % 3 == 0 and refs["nonproj_cats"]:
                entries.append(WorkloadEntry(
                    account_id=acc, work_date=d, activity_type_id=2,
                    category_id=refs["nonproj_cats"][i % len(refs["nonproj_cats"])], project_id=None,
                    task_type_id=refs["tasks"][(i + 1) % len(refs["tasks"])],
                    task_description="Toplanti ve planlama", status="completed",
                    complexity="low", quantity=None, hours_spent=rest,
                ))
            else:
                entries.append(_project_entry(acc, d, refs, i + 2, rest, DESCRIPTIONS[(i + 3) % len(DESCRIPTIONS)], "completed", "medium"))
        else:
            entries.append(_project_entry(acc, d, refs, i, total, desc, status, cx))
        if i % 8 == 0 and refs["selfimp_cats"]:
            entries.append(WorkloadEntry(
                account_id=acc, work_date=d, activity_type_id=3,
                category_id=refs["selfimp_cats"][i % len(refs["selfimp_cats"])], project_id=None,
                task_type_id=refs["tasks"][(i + 2) % len(refs["tasks"])],
                task_description="Egitim / kisisel gelisim", status="completed",
                complexity="low", quantity=None, hours_spent=Decimal("1.00"),
            ))
        i += 1
    return entries, i


def _build_full8(acc, year, month, refs):
    """Exactly 8h every working day -> on the expected target (all green)."""
    entries = []
    for d in _month_days(year, month):
        if d.weekday() >= 5:
            continue
        entries.append(WorkloadEntry(
            account_id=acc, work_date=d, activity_type_id=1,
            category_id=refs["proj_cats"][0], project_id=refs["projects"][0],
            task_type_id=refs["tasks"][0],
            task_description="Gunluk proje calismasi", status="completed",
            complexity="medium", quantity=None, hours_spent=Decimal("8.00"),
        ))
    return entries


async def main() -> None:
    async with AsyncSessionLocal() as db:
        worker_role = (await db.execute(select(Role).where(Role.code == WORKER_ROLE_CODE))).scalar_one_or_none()
        if worker_role is None:
            raise SystemExit("WORKER role not found — run `alembic upgrade head` first.")

        # Optional niceties: attach an Engineering team + a manager if they exist.
        team = (await db.execute(select(Team).where(Team.name == "Engineering"))).scalar_one_or_none()
        team_id = team.id if team else None
        manager = (
            await db.execute(select(User.account_id).join(Role, User.role_id == Role.id).where(Role.code == "MANAGER").limit(1))
        ).scalar_one_or_none()

        if not (await _refs(db))["projects"]:
            raise SystemExit("No projects/lookups found — run `alembic upgrade head` first.")
        refs = await _refs(db)

        print(f"Seeding demo workload for year {YEAR}...")
        hasan = await _get_or_create_worker(db, HASAN, worker_role.id, team_id, manager)
        ipek = await _get_or_create_worker(db, IPEK, worker_role.id, team_id, manager)

        # Hasan: varied April + May
        total = 0
        for month in (4, 5):
            await _clear_month(db, hasan, YEAR, month)
        i = 0
        for month in (4, 5):
            entries, i = _build_varied(hasan, YEAR, month, refs, i)
            db.add_all(entries)
            total += len(entries)
        print(f"  Hasan Deniz: {total} entries across April+May (varied)")

        # Ipek: May fully on-target (8h/day)
        await _clear_month(db, ipek, YEAR, 5)
        ipek_entries = _build_full8(ipek, YEAR, 5)
        db.add_all(ipek_entries)
        print(f"  Ipek Yagmur Kuzum: {len(ipek_entries)} May entries (8h each working day)")

        await db.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
