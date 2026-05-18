"""Positions CRUD — company job titles that drive the org hierarchy.

Independent from `roles` (auth). All authenticated users can read; only non-WORKER
roles can mutate. Soft-delete via `is_active`; hard-delete is intentionally not
exposed (positions are FK-referenced by users.position_id with ON DELETE RESTRICT).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import forbid_worker, get_current_user
from app.core.database import get_db
from app.models import Position, User
from app.schemas.lookup import UsageCount
from app.schemas.position import PositionCreate, PositionOut, PositionUpdate

router = APIRouter(prefix="/positions", tags=["positions"])


async def _get(db: AsyncSession, item_id: int) -> Position:
    obj = (
        await db.execute(select(Position).where(Position.id == item_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Position not found")
    return obj


async def _check_no_cycle(
    db: AsyncSession, position_id: int, new_parent_id: int | None
) -> None:
    """Walk up from new_parent and make sure we never reach position_id."""
    if new_parent_id is None:
        return
    cursor = new_parent_id
    seen: set[int] = set()
    while cursor is not None:
        if cursor == position_id:
            raise HTTPException(
                status_code=400,
                detail="Parent assignment would create a cycle",
            )
        if cursor in seen:
            # Existing data is broken — bail out rather than loop forever.
            raise HTTPException(
                status_code=400, detail="Existing position tree has a cycle"
            )
        seen.add(cursor)
        row = (
            await db.execute(
                select(Position.parent_position_id).where(Position.id == cursor)
            )
        ).scalar_one_or_none()
        cursor = row


@router.get("", response_model=list[PositionOut])
async def list_positions(
    search: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Position]:
    stmt = select(Position)
    if not include_inactive:
        stmt = stmt.where(Position.is_active.is_(True))
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(or_(Position.name.ilike(like)))
    stmt = stmt.order_by(Position.id)
    return list((await db.execute(stmt)).scalars().all())


@router.get("/{item_id}", response_model=PositionOut)
async def get_position(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Position:
    return await _get(db, item_id)


@router.get("/{item_id}/usage", response_model=UsageCount)
async def position_usage(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> UsageCount:
    stmt = select(func.count(User.id)).where(User.position_id == item_id)
    n = int((await db.execute(stmt)).scalar() or 0)
    return UsageCount(count=n)


@router.post("", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
async def create_position(
    payload: PositionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Position:
    # Unique name
    clash = (
        await db.execute(select(Position).where(Position.name == payload.name))
    ).scalar_one_or_none()
    if clash is not None:
        raise HTTPException(status_code=400, detail="Position name already in use")
    if payload.parent_position_id is not None:
        await _get(db, payload.parent_position_id)

    obj = Position(**payload.model_dump())
    db.add(obj)
    await db.flush()
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{item_id}", response_model=PositionOut)
async def update_position(
    item_id: int,
    payload: PositionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Position:
    obj = await _get(db, item_id)
    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] != obj.name:
        clash = (
            await db.execute(
                select(Position).where(
                    Position.name == data["name"], Position.id != item_id
                )
            )
        ).scalar_one_or_none()
        if clash is not None:
            raise HTTPException(status_code=400, detail="Position name already in use")

    if "parent_position_id" in data:
        new_parent = data["parent_position_id"]
        if new_parent is not None:
            await _get(db, new_parent)
        await _check_no_cycle(db, item_id, new_parent)

    for field, value in data.items():
        setattr(obj, field, value)
    await db.flush()
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{item_id}", response_model=PositionOut)
async def soft_delete_position(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Position:
    obj = await _get(db, item_id)
    # Block deactivation if any active user holds this position — otherwise
    # the dropdown would have no valid value for them.
    used = (
        await db.execute(
            select(func.count(User.id)).where(
                User.position_id == item_id, User.is_active.is_(True)
            )
        )
    ).scalar() or 0
    if used:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot deactivate: {used} active user(s) still hold this position"
            ),
        )
    obj.is_active = False
    await db.flush()
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/{item_id}/activate", response_model=PositionOut)
async def activate_position(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Position:
    obj = await _get(db, item_id)
    obj.is_active = True
    await db.flush()
    await db.commit()
    await db.refresh(obj)
    return obj
