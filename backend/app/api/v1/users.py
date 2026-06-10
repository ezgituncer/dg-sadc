"""User CRUD — non-WORKER roles only."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_permission, require_superuser
from app.core.database import get_db
from app.core.permissions import USERS_MANAGE, USERS_VIEW
from app.models import User
from app.schemas.user import (
    PasswordResetRequest,
    UserCreate,
    UserDirectoryEntry,
    UserOut,
    UserUpdate,
)
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/directory", response_model=list[UserDirectoryEntry])
async def directory(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[UserDirectoryEntry]:
    """All active users with just account_id + name + role/team — viewable by every
    authenticated user (workers included). Used by the listings table to show names."""
    rows = (
        await db.execute(select(User).where(User.is_active.is_(True)).order_by(User.name))
    ).scalars().all()
    return [UserDirectoryEntry.from_model(u) for u in rows]


@router.get("", response_model=list[UserOut])
async def list_users(
    role_id: int | None = Query(default=None),
    team_id: int | None = Query(default=None),
    is_active: bool | None = Query(default=True),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(USERS_VIEW)),
) -> list[UserOut]:
    users = await user_service.list_users(
        db,
        role_id=role_id,
        team_id=team_id,
        is_active=is_active,
        search=search,
    )
    return [UserOut.from_model(u) for u in users]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(USERS_VIEW)),
) -> UserOut:
    user = await user_service.get_user(db, user_id)
    return UserOut.from_model(user)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(USERS_MANAGE)),
) -> UserOut:
    user = await user_service.create_user(db, payload)
    await db.commit()
    await db.refresh(user)
    return UserOut.from_model(user)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_permission(USERS_MANAGE)),
) -> UserOut:
    user = await user_service.update_user(db, user_id, payload, actor=actor)
    await db.commit()
    await db.refresh(user)
    return UserOut.from_model(user)


@router.post(
    "/{user_id}/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def reset_password(
    user_id: int,
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superuser),
) -> Response:
    await user_service.reset_password(db, user_id, payload.new_password)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{user_id}", response_model=UserOut)
async def soft_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_permission(USERS_MANAGE)),
) -> UserOut:
    user = await user_service.soft_delete_user(db, user_id, actor=actor)
    await db.commit()
    return UserOut.from_model(user)


@router.post("/{user_id}/activate", response_model=UserOut)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(USERS_MANAGE)),
) -> UserOut:
    user = await user_service.activate_user(db, user_id)
    await db.commit()
    return UserOut.from_model(user)
