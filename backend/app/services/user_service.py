"""Business logic for users — CRUD + hierarchy validation + soft delete."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Role, User
from app.schemas.user import UserCreate, UserUpdate


WORKER_ROLE_CODE = "WORKER"
MANAGER_ROLE_CODE = "MANAGER"


async def _get_role(db: AsyncSession, role_id: int) -> Role:
    role = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=400, detail=f"Unknown role_id={role_id}")
    return role


async def _validate_hierarchy(
    db: AsyncSession,
    role_id: int,
    manager_account_id: str | None,
) -> None:
    """Enforce: a WORKER's manager must have role MANAGER (cannot be another WORKER)."""
    role = await _get_role(db, role_id)
    if role.code != WORKER_ROLE_CODE:
        return
    if manager_account_id is None:
        raise HTTPException(
            status_code=400,
            detail="Workers must have a manager (manager_account_id is required)",
        )
    manager = (
        await db.execute(select(User).where(User.account_id == manager_account_id))
    ).scalar_one_or_none()
    if manager is None or not manager.is_active:
        raise HTTPException(
            status_code=400,
            detail="Manager not found or inactive",
        )
    if manager.role and manager.role.code != MANAGER_ROLE_CODE:
        raise HTTPException(
            status_code=400,
            detail="A worker's manager must have role MANAGER",
        )


async def list_users(
    db: AsyncSession,
    *,
    role_id: int | None = None,
    team_id: int | None = None,
    is_active: bool | None = True,
    search: str | None = None,
) -> list[User]:
    stmt = select(User)
    if role_id is not None:
        stmt = stmt.where(User.role_id == role_id)
    if team_id is not None:
        stmt = stmt.where(User.team_id == team_id)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                User.name.ilike(like),
                User.email.ilike(like),
                User.account_id.ilike(like),
            )
        )
    stmt = stmt.order_by(User.name)
    return list((await db.execute(stmt)).scalars().all())


async def get_user(db: AsyncSession, user_id: int) -> User:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def create_user(db: AsyncSession, payload: UserCreate) -> User:
    # Uniqueness checks
    exists_account = (
        await db.execute(select(User).where(User.account_id == payload.account_id))
    ).scalar_one_or_none()
    if exists_account is not None:
        raise HTTPException(status_code=400, detail="account_id already in use")

    exists_email = (
        await db.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if exists_email is not None:
        raise HTTPException(status_code=400, detail="email already in use")

    await _validate_hierarchy(db, payload.role_id, payload.manager_account_id)

    user = User(
        account_id=payload.account_id,
        email=payload.email.lower(),
        name=payload.name,
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
        position=payload.position,
        role_id=payload.role_id,
        team_id=payload.team_id,
        manager_account_id=payload.manager_account_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    user_id: int,
    payload: UserUpdate,
    *,
    actor: User,
) -> User:
    user = await get_user(db, user_id)

    data = payload.model_dump(exclude_unset=True)

    if "is_active" in data and data["is_active"] is False and actor.id == user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")

    if "email" in data and data["email"] is not None:
        new_email = data["email"].lower()
        if new_email != user.email:
            clash = (
                await db.execute(
                    select(User).where(User.email == new_email, User.id != user_id)
                )
            ).scalar_one_or_none()
            if clash is not None:
                raise HTTPException(status_code=400, detail="email already in use")
            data["email"] = new_email

    # If role/manager change, re-validate hierarchy
    new_role_id = data.get("role_id", user.role_id)
    new_manager = data.get("manager_account_id", user.manager_account_id)
    if "role_id" in data or "manager_account_id" in data:
        await _validate_hierarchy(db, new_role_id, new_manager)

    for field, value in data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return user


async def reset_password(db: AsyncSession, user_id: int, new_password: str) -> None:
    user = await get_user(db, user_id)
    user.password_hash = hash_password(new_password)
    await db.flush()


async def soft_delete_user(db: AsyncSession, user_id: int, *, actor: User) -> User:
    user = await get_user(db, user_id)
    if actor.id == user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")

    # Block deletion if the user has active reports.
    active_reports = (
        await db.execute(
            select(User).where(
                User.manager_account_id == user.account_id,
                User.is_active == True,  # noqa: E712
            )
        )
    ).scalars().all()
    if active_reports:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot delete: this user manages {len(active_reports)} active employee(s). "
                "Reassign their manager first."
            ),
        )

    user.is_active = False
    await db.flush()
    await db.refresh(user)
    return user


async def activate_user(db: AsyncSession, user_id: int) -> User:
    user = await get_user(db, user_id)
    user.is_active = True
    await db.flush()
    await db.refresh(user)
    return user
