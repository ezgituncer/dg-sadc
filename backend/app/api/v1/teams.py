"""Teams CRUD — non-WORKER can manage; anyone authenticated can list."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import forbid_worker, get_current_user
from app.core.database import get_db
from app.models import Team, User
from app.schemas.lookup import UsageCount
from app.schemas.team import TeamCreate, TeamOut, TeamUpdate
from app.services import lookup_service

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamOut])
async def list_teams(
    search: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Team]:
    return await lookup_service.list_items(
        db, Team, search=search, include_inactive=include_inactive
    )


@router.get("/{item_id}", response_model=TeamOut)
async def get_team(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Team:
    return await lookup_service.get_item(db, Team, item_id)


@router.get("/{item_id}/usage", response_model=UsageCount)
async def team_usage(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> UsageCount:
    stmt = select(func.count(User.id)).where(User.team_id == item_id)
    n = int((await db.execute(stmt)).scalar() or 0)
    return UsageCount(count=n)


@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(
    payload: TeamCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Team:
    obj = await lookup_service.create_item(db, Team, payload)
    await db.commit()
    return obj


@router.patch("/{item_id}", response_model=TeamOut)
async def update_team(
    item_id: int,
    payload: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Team:
    obj = await lookup_service.update_item(db, Team, item_id, payload)
    await db.commit()
    return obj


@router.delete("/{item_id}", response_model=TeamOut)
async def soft_delete_team(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Team:
    obj = await lookup_service.soft_delete(db, Team, item_id)
    await db.commit()
    return obj


@router.post("/{item_id}/activate", response_model=TeamOut)
async def activate_team(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> Team:
    obj = await lookup_service.activate(db, Team, item_id)
    await db.commit()
    return obj
