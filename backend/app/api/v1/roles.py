"""Roles — read-only listing + edit of name/description.

The `code` column is bound to permission checks in code, so it is intentionally
immutable here. New roles cannot be added through the API and existing roles
cannot be deleted — see CLAUDE.md "Roles (fixed, code immutable)".
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import forbid_worker, get_current_user
from app.core.database import get_db
from app.models import Role, User
from app.schemas.lookup import UsageCount
from app.schemas.role import RoleOut, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleOut])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Role]:
    rows = (await db.execute(select(Role).order_by(Role.id))).scalars().all()
    return list(rows)


@router.get("/{item_id}", response_model=RoleOut)
async def get_role(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Role:
    obj = (
        await db.execute(select(Role).where(Role.id == item_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return obj


@router.get("/{item_id}/usage", response_model=UsageCount)
async def role_usage(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> UsageCount:
    stmt = select(func.count(User.id)).where(User.role_id == item_id)
    n = int((await db.execute(stmt)).scalar() or 0)
    return UsageCount(count=n)


@router.patch("/{item_id}", response_model=RoleOut)
async def update_role(
    item_id: int,
    payload: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Role:
    obj = (
        await db.execute(select(Role).where(Role.id == item_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Role not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(obj, field, value)
    await db.flush()
    await db.commit()
    await db.refresh(obj)
    return obj
