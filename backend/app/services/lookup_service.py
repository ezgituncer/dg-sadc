"""Generic CRUD logic for the 6 lookup tables.

Code is immutable — the update schemas don't include it. Soft delete sets
is_active=false; reactivate flips it back. Usage count is implemented per
caller because the join column differs (category_id depends on activity_type_id).
"""
from __future__ import annotations

from typing import Any, Type

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base
from app.models import (
    ActivityType,
    NonProjectCategory,
    Project,
    ProjectCategory,
    SelfImpCategory,
    TaskType,
    WorkloadEntry,
)


async def list_items(
    db: AsyncSession,
    model: Type[Base],
    *,
    search: str | None = None,
    include_inactive: bool = False,
) -> list[Any]:
    stmt = select(model)
    if not include_inactive:
        stmt = stmt.where(model.is_active.is_(True))
    if search:
        like = f"%{search.strip()}%"
        if hasattr(model, "code"):
            stmt = stmt.where(or_(model.code.ilike(like), model.name.ilike(like)))
        else:
            stmt = stmt.where(model.name.ilike(like))
    stmt = stmt.order_by(model.id)
    return list((await db.execute(stmt)).scalars().all())


async def get_item(db: AsyncSession, model: Type[Base], item_id: int) -> Any:
    obj = (await db.execute(select(model).where(model.id == item_id))).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


async def create_item(
    db: AsyncSession,
    model: Type[Base],
    payload: BaseModel,
) -> Any:
    data = payload.model_dump()
    code = data.get("code")
    if code is not None:
        clash = (
            await db.execute(select(model).where(model.code == code))
        ).scalar_one_or_none()
        if clash is not None:
            raise HTTPException(status_code=400, detail="code already in use")
    obj = model(**data)
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def update_item(
    db: AsyncSession,
    model: Type[Base],
    item_id: int,
    payload: BaseModel,
) -> Any:
    obj = await get_item(db, model, item_id)
    data = payload.model_dump(exclude_unset=True)
    # code is intentionally absent from update schemas — defense in depth.
    data.pop("code", None)
    for field, value in data.items():
        setattr(obj, field, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def soft_delete(db: AsyncSession, model: Type[Base], item_id: int) -> Any:
    obj = await get_item(db, model, item_id)
    obj.is_active = False
    await db.flush()
    await db.refresh(obj)
    return obj


async def activate(db: AsyncSession, model: Type[Base], item_id: int) -> Any:
    obj = await get_item(db, model, item_id)
    obj.is_active = True
    await db.flush()
    await db.refresh(obj)
    return obj


# --- Usage count -------------------------------------------------------------
# Each lookup type uses a different column on workload_entries.

_ACTIVITY_TO_CATEGORY_TABLE = {
    1: ProjectCategory,
    2: NonProjectCategory,
    3: SelfImpCategory,
}


async def count_usage_for_project(db: AsyncSession, project_id: int) -> int:
    from sqlalchemy import func

    stmt = select(func.count(WorkloadEntry.id)).where(WorkloadEntry.project_id == project_id)
    return int((await db.execute(stmt)).scalar() or 0)


async def count_usage_for_activity_type(db: AsyncSession, activity_type_id: int) -> int:
    from sqlalchemy import func

    stmt = select(func.count(WorkloadEntry.id)).where(
        WorkloadEntry.activity_type_id == activity_type_id
    )
    return int((await db.execute(stmt)).scalar() or 0)


async def count_usage_for_task_type(db: AsyncSession, task_type_id: int) -> int:
    from sqlalchemy import func

    stmt = select(func.count(WorkloadEntry.id)).where(
        WorkloadEntry.task_type_id == task_type_id
    )
    return int((await db.execute(stmt)).scalar() or 0)


async def count_usage_for_category(
    db: AsyncSession, activity_type_id: int, category_id: int
) -> int:
    from sqlalchemy import func

    stmt = select(func.count(WorkloadEntry.id)).where(
        WorkloadEntry.activity_type_id == activity_type_id,
        WorkloadEntry.category_id == category_id,
    )
    return int((await db.execute(stmt)).scalar() or 0)


def category_table_for_activity(activity_type_id: int) -> Type[Base]:
    """Resolve the right category table for a given activity_type_id."""
    table = _ACTIVITY_TO_CATEGORY_TABLE.get(activity_type_id)
    if table is None:
        raise HTTPException(status_code=400, detail=f"Unknown activity_type_id={activity_type_id}")
    return table


# Re-export for routers
PROJECT_CATEGORY = ProjectCategory
NON_PROJECT_CATEGORY = NonProjectCategory
SELF_IMP_CATEGORY = SelfImpCategory
ACTIVITY_TYPE = ActivityType
PROJECT = Project
TASK_TYPE = TaskType
