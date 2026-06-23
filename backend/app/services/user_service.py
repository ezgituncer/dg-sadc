"""Business logic for users — CRUD + position-based hierarchy + soft delete.

The org hierarchy lives entirely on `position` now. `role` is auth-only and
deliberately not consulted by `_validate_hierarchy`. Rule: a user holding
position P must report to a user whose position is an ANCESTOR of P — the
immediate parent or any position higher up the parent chain (so e.g. a Tech Lead
may report to its Engineering Manager or to the Head of Engineering above that).
Root positions (parent_position_id IS NULL) cannot have a manager.
"""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Position, User
from app.schemas.user import UserCreate, UserUpdate


async def _get_position(db: AsyncSession, position_id: int) -> Position:
    pos = (
        await db.execute(select(Position).where(Position.id == position_id))
    ).scalar_one_or_none()
    if pos is None:
        raise HTTPException(status_code=400, detail=f"Unknown position_id={position_id}")
    if not pos.is_active:
        raise HTTPException(status_code=400, detail=f"Position {pos.name!r} is inactive")
    return pos


async def _ancestor_position_ids(db: AsyncSession, start_position_id: int) -> list[int]:
    """All position ids from `start_position_id` up to the root, inclusive.

    Walks the `parent_position_id` chain so callers can check membership against
    every position above a given point (not just the immediate parent)."""
    ids: list[int] = []
    cursor: int | None = start_position_id
    guard = 50  # safety against malformed cycles
    while cursor is not None and guard > 0:
        ids.append(cursor)
        pos = await _get_position(db, cursor)
        cursor = pos.parent_position_id
        guard -= 1
    return ids


async def _validate_hierarchy(
    db: AsyncSession,
    position_id: int | None,
    manager_account_id: str | None,
) -> None:
    """A user's manager must hold an ANCESTOR position of theirs.

    - position_id is None      → no constraint (legacy users with no position set).
    - parent_position_id None  → root: must NOT have a manager.
    - otherwise                → manager required and manager.position_id must be
                                 the immediate parent OR any position higher up the
                                 parent_position_id chain. e.g. a Tech Lead may
                                 report to the Engineering Manager above it OR to
                                 the Head of Engineering above that.
    """
    if position_id is None:
        return

    pos = await _get_position(db, position_id)

    if pos.parent_position_id is None:
        if manager_account_id is not None:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Position {pos.name!r} is a root position — manager must be empty"
                ),
            )
        return

    if manager_account_id is None:
        parent = await _get_position(db, pos.parent_position_id)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Position {pos.name!r} requires a manager whose position is "
                f"{parent.name!r}"
            ),
        )

    manager = (
        await db.execute(select(User).where(User.account_id == manager_account_id))
    ).scalar_one_or_none()
    if manager is None or not manager.is_active:
        raise HTTPException(status_code=400, detail="Manager not found or inactive")

    ancestor_ids = await _ancestor_position_ids(db, pos.parent_position_id)
    if manager.position_id not in ancestor_ids:
        parent = await _get_position(db, pos.parent_position_id)
        manager_pos_name = manager.position.name if manager.position else "(none)"
        raise HTTPException(
            status_code=400,
            detail=(
                f"Manager's position is {manager_pos_name!r}, but position "
                f"{pos.name!r} must report to {parent.name!r} or a position above it"
            ),
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

    await _validate_hierarchy(db, payload.position_id, payload.manager_account_id)

    user = User(
        account_id=payload.account_id,
        email=payload.email.lower(),
        name=payload.name,
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
        role_id=payload.role_id,
        position_id=payload.position_id,
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

    # If position/manager change, re-validate hierarchy. Role no longer
    # participates in the hierarchy check — auth-only now.
    new_position_id = data.get("position_id", user.position_id)
    new_manager = data.get("manager_account_id", user.manager_account_id)
    if "position_id" in data or "manager_account_id" in data:
        await _validate_hierarchy(db, new_position_id, new_manager)

    for field, value in data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return user


async def reset_password(
    db: AsyncSession, user_id: int, new_password: str, *, actor: User
) -> None:
    """Reset another user's password. Allowed for superusers (admin) and for a
    manager resetting one of their OWN direct team members."""
    user = await get_user(db, user_id)
    is_superuser = bool(actor.role and actor.role.is_superuser)
    is_direct_manager = user.manager_account_id == actor.account_id
    if not (is_superuser or is_direct_manager):
        raise HTTPException(
            status_code=403,
            detail="You can only reset passwords for your own team members",
        )
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
