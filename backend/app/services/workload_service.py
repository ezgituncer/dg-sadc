"""Workload entry business logic — CRUD with 30-day window + ownership rules."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    NonProjectCategory,
    ProjectCategory,
    SelfImpCategory,
    User,
    WorkloadEntry,
)
from app.schemas.workload import WorkloadEntryCreate, WorkloadEntryUpdate

EDIT_WINDOW_DAYS = 30

ALLOWED_SORT_COLUMNS = {
    "work_date": WorkloadEntry.work_date,
    "hours_spent": WorkloadEntry.hours_spent,
    "created_at": WorkloadEntry.created_at,
    "id": WorkloadEntry.id,
}

_ACTIVITY_TO_CATEGORY_TABLE = {
    1: ProjectCategory,
    2: NonProjectCategory,
    3: SelfImpCategory,
}


def _today() -> date:
    return date.today()


def _check_within_edit_window(work_date: date) -> None:
    today = _today()
    if work_date > today:
        raise HTTPException(status_code=400, detail="work_date cannot be in the future")
    if work_date < today - timedelta(days=EDIT_WINDOW_DAYS):
        raise HTTPException(
            status_code=400,
            detail=f"work_date must be within the last {EDIT_WINDOW_DAYS} days",
        )


async def _validate_category_for_activity(
    db: AsyncSession, activity_type_id: int, category_id: int
) -> None:
    table = _ACTIVITY_TO_CATEGORY_TABLE.get(activity_type_id)
    if table is None:
        raise HTTPException(
            status_code=400, detail=f"Unknown activity_type_id={activity_type_id}"
        )
    row = (
        await db.execute(
            select(table).where(table.id == category_id, table.is_active.is_(True))
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"category_id={category_id} is not a valid active category "
                f"for activity_type={activity_type_id}"
            ),
        )


async def list_entries(
    db: AsyncSession,
    *,
    account_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    project_id: int | None = None,
    activity_type_id: int | None = None,
    task_type_id: int | None = None,
    status: str | None = None,
    complexity: str | None = None,
    search: str | None = None,
    sort: str = "work_date",
    direction: str = "desc",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[WorkloadEntry], int]:
    page = max(1, page)
    page_size = max(1, min(page_size, 200))

    stmt = select(WorkloadEntry)
    count_stmt = select(func.count(WorkloadEntry.id))

    conditions = []
    if account_id:
        conditions.append(WorkloadEntry.account_id == account_id)
    if date_from:
        conditions.append(WorkloadEntry.work_date >= date_from)
    if date_to:
        conditions.append(WorkloadEntry.work_date <= date_to)
    if project_id is not None:
        conditions.append(WorkloadEntry.project_id == project_id)
    if activity_type_id is not None:
        conditions.append(WorkloadEntry.activity_type_id == activity_type_id)
    if task_type_id is not None:
        conditions.append(WorkloadEntry.task_type_id == task_type_id)
    if status:
        conditions.append(WorkloadEntry.status == status)
    if complexity:
        conditions.append(WorkloadEntry.complexity == complexity)
    if search:
        conditions.append(WorkloadEntry.task_description.ilike(f"%{search.strip()}%"))

    if conditions:
        cond = and_(*conditions)
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    sort_col = ALLOWED_SORT_COLUMNS.get(sort, WorkloadEntry.work_date)
    sort_fn = desc if direction.lower() == "desc" else asc
    stmt = stmt.order_by(sort_fn(sort_col), desc(WorkloadEntry.id))

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    items = list((await db.execute(stmt)).scalars().all())
    total = int((await db.execute(count_stmt)).scalar() or 0)
    return items, total


async def get_entry(db: AsyncSession, entry_id: int) -> WorkloadEntry:
    obj = (
        await db.execute(select(WorkloadEntry).where(WorkloadEntry.id == entry_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Workload entry not found")
    return obj


async def create_entry(
    db: AsyncSession, payload: WorkloadEntryCreate, *, actor: User
) -> WorkloadEntry:
    _check_within_edit_window(payload.work_date)
    await _validate_category_for_activity(db, payload.activity_type_id, payload.category_id)

    entry = WorkloadEntry(
        account_id=actor.account_id,  # always overridden — TASK.md rule
        work_date=payload.work_date,
        activity_type_id=payload.activity_type_id,
        category_id=payload.category_id,
        project_id=payload.project_id,
        task_type_id=payload.task_type_id,
        task_description=payload.task_description,
        status=payload.status,
        complexity=payload.complexity,
        quantity=payload.quantity,
        hours_spent=payload.hours_spent,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def update_entry(
    db: AsyncSession,
    entry_id: int,
    payload: WorkloadEntryUpdate,
    *,
    actor: User,
) -> WorkloadEntry:
    entry = await get_entry(db, entry_id)
    _enforce_ownership(entry, actor)
    _check_within_edit_window(entry.work_date)

    data = payload.model_dump(exclude_unset=True)
    if "work_date" in data and data["work_date"] != entry.work_date:
        _check_within_edit_window(data["work_date"])

    new_activity = data.get("activity_type_id", entry.activity_type_id)
    new_category = data.get("category_id", entry.category_id)
    new_project = data.get("project_id", entry.project_id)

    # Re-validate project consistency (mirrors the create-time check).
    if new_activity == 1 and new_project is None:
        raise HTTPException(
            status_code=400, detail="project_id is required when activity_type=PROJECT"
        )
    if new_activity in (2, 3) and new_project is not None:
        raise HTTPException(
            status_code=400, detail="project_id must be empty for non-project activities"
        )

    if "activity_type_id" in data or "category_id" in data:
        await _validate_category_for_activity(db, new_activity, new_category)

    for field, value in data.items():
        setattr(entry, field, value)

    await db.flush()
    await db.refresh(entry)
    return entry


async def delete_entry(db: AsyncSession, entry_id: int, *, actor: User) -> None:
    entry = await get_entry(db, entry_id)
    _enforce_ownership(entry, actor)
    _check_within_edit_window(entry.work_date)
    await db.delete(entry)
    await db.flush()


def _enforce_ownership(entry: WorkloadEntry, actor: User) -> None:
    """Even ADMIN cannot edit/delete someone else's entry — company policy."""
    if entry.account_id != actor.account_id:
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own workload entries",
        )


async def daily_total_hours(
    db: AsyncSession, account_id: str, day: date
) -> Decimal:
    """Sum of hours for a user on a given day (used by the entry form's right panel)."""
    stmt = select(func.coalesce(func.sum(WorkloadEntry.hours_spent), 0)).where(
        WorkloadEntry.account_id == account_id,
        WorkloadEntry.work_date == day,
    )
    return Decimal((await db.execute(stmt)).scalar() or 0)


async def aggregates(
    db: AsyncSession,
    *,
    account_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    project_id: int | None = None,
    activity_type_id: int | None = None,
    task_type_id: int | None = None,
    status: str | None = None,
    complexity: str | None = None,
    search: str | None = None,
) -> dict:
    """Three GROUP BY queries used by the listings page to draw charts.

    Returns chart-ready arrays for: (1) hours by date (continuous range filled with
    zeros for missing days when a date range is specified), (2) hours by project,
    (3) hours by activity type. Names are joined in so the frontend can render
    labels without a second round-trip.
    """
    from app.models import ActivityType, Project

    base_conditions = []
    if account_id:
        base_conditions.append(WorkloadEntry.account_id == account_id)
    if date_from:
        base_conditions.append(WorkloadEntry.work_date >= date_from)
    if date_to:
        base_conditions.append(WorkloadEntry.work_date <= date_to)
    if project_id is not None:
        base_conditions.append(WorkloadEntry.project_id == project_id)
    if activity_type_id is not None:
        base_conditions.append(WorkloadEntry.activity_type_id == activity_type_id)
    if task_type_id is not None:
        base_conditions.append(WorkloadEntry.task_type_id == task_type_id)
    if status:
        base_conditions.append(WorkloadEntry.status == status)
    if complexity:
        base_conditions.append(WorkloadEntry.complexity == complexity)
    if search:
        base_conditions.append(WorkloadEntry.task_description.ilike(f"%{search.strip()}%"))

    base_where = and_(*base_conditions) if base_conditions else None

    # 1) by date
    date_stmt = select(
        WorkloadEntry.work_date,
        func.coalesce(func.sum(WorkloadEntry.hours_spent), 0).label("hours"),
    )
    if base_where is not None:
        date_stmt = date_stmt.where(base_where)
    date_stmt = date_stmt.group_by(WorkloadEntry.work_date).order_by(
        WorkloadEntry.work_date
    )
    date_rows = (await db.execute(date_stmt)).all()
    date_map = {row[0]: Decimal(row[1]) for row in date_rows}

    # Fill in missing days when a date range is given
    by_date: list[dict] = []
    if date_from and date_to:
        cursor = date_from
        while cursor <= date_to:
            by_date.append(
                {"date": cursor, "hours": date_map.get(cursor, Decimal(0))}
            )
            cursor = cursor + timedelta(days=1)
    else:
        by_date = [{"date": d, "hours": h} for d, h in sorted(date_map.items())]

    # 2) by project
    proj_stmt = (
        select(
            WorkloadEntry.project_id,
            Project.name,
            func.coalesce(func.sum(WorkloadEntry.hours_spent), 0).label("hours"),
        )
        .outerjoin(Project, Project.id == WorkloadEntry.project_id)
    )
    if base_where is not None:
        proj_stmt = proj_stmt.where(base_where)
    proj_stmt = proj_stmt.group_by(WorkloadEntry.project_id, Project.name).order_by(
        func.sum(WorkloadEntry.hours_spent).desc()
    )
    proj_rows = (await db.execute(proj_stmt)).all()
    by_project = [
        {
            "project_id": r[0],
            "name": r[1] or "Project-yok",
            "hours": Decimal(r[2]),
        }
        for r in proj_rows
    ]

    # 3) by activity type
    act_stmt = (
        select(
            WorkloadEntry.activity_type_id,
            ActivityType.name,
            func.coalesce(func.sum(WorkloadEntry.hours_spent), 0).label("hours"),
        )
        .join(ActivityType, ActivityType.id == WorkloadEntry.activity_type_id)
    )
    if base_where is not None:
        act_stmt = act_stmt.where(base_where)
    act_stmt = act_stmt.group_by(
        WorkloadEntry.activity_type_id, ActivityType.name
    ).order_by(func.sum(WorkloadEntry.hours_spent).desc())
    act_rows = (await db.execute(act_stmt)).all()
    by_activity = [
        {
            "activity_type_id": r[0],
            "name": r[1],
            "hours": Decimal(r[2]),
        }
        for r in act_rows
    ]

    # Totals
    totals_stmt = select(
        func.count(WorkloadEntry.id),
        func.coalesce(func.sum(WorkloadEntry.hours_spent), 0),
    )
    if base_where is not None:
        totals_stmt = totals_stmt.where(base_where)
    total_row = (await db.execute(totals_stmt)).one()

    return {
        "by_date": by_date,
        "by_project": by_project,
        "by_activity": by_activity,
        "total_entries": int(total_row[0] or 0),
        "total_hours": Decimal(total_row[1] or 0),
    }
