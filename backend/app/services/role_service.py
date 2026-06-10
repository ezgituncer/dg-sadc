"""Role + permission management business logic.

Roles are now fully CRUD-able. Permission codes come from the code-defined catalog
(app.core.permissions); a role links to a subset via the role_permissions table.
The ADMIN role is a superuser (is_superuser) and the six seeded roles are system
roles (is_system) that cannot be deleted.
"""
from __future__ import annotations

import re

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Permission, Role, User
from app.schemas.role import RoleCreate, RoleUpdate


async def list_roles(db: AsyncSession) -> list[Role]:
    rows = (await db.execute(select(Role).order_by(Role.id))).scalars().all()
    return list(rows)


async def get_role(db: AsyncSession, role_id: int) -> Role:
    obj = (await db.execute(select(Role).where(Role.id == role_id))).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return obj


async def role_usage(db: AsyncSession, role_id: int) -> int:
    return int(
        (await db.execute(select(func.count(User.id)).where(User.role_id == role_id))).scalar()
        or 0
    )


def _slugify_code(name: str) -> str:
    code = re.sub(r"[^A-Za-z0-9]+", "_", name.strip()).strip("_").upper()
    return (code or "ROLE")[:50]


async def _unique_code(db: AsyncSession, base: str) -> str:
    existing = set(
        (await db.execute(select(Role.code))).scalars().all()
    )
    if base not in existing:
        return base
    i = 2
    while f"{base}_{i}"[:50] in existing:
        i += 1
    return f"{base}_{i}"[:50]


async def _resolve_permissions(db: AsyncSession, codes: list[str]) -> list[Permission]:
    codes = list(dict.fromkeys(codes))  # de-dupe, preserve order
    if not codes:
        return []
    rows = list(
        (await db.execute(select(Permission).where(Permission.code.in_(codes)))).scalars().all()
    )
    found = {p.code for p in rows}
    unknown = [c for c in codes if c not in found]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown permission(s): {', '.join(unknown)}")
    return rows


async def create_role(db: AsyncSession, payload: RoleCreate) -> Role:
    code = await _unique_code(db, _slugify_code(payload.name))
    role = Role(
        code=code,
        name=payload.name,
        description=payload.description,
        is_superuser=False,
        is_system=False,
    )
    role.permissions = await _resolve_permissions(db, payload.permissions)
    db.add(role)
    await db.flush()
    await db.commit()
    # Re-fetch so the selectin permissions relationship is freshly loaded.
    return await get_role(db, role.id)


async def update_role(db: AsyncSession, role_id: int, payload: RoleUpdate) -> Role:
    role = await get_role(db, role_id)
    if payload.name is not None:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description
    # Superuser roles implicitly hold every permission; ignore explicit changes.
    if payload.permissions is not None and not role.is_superuser:
        role.permissions = await _resolve_permissions(db, payload.permissions)
    await db.flush()
    await db.commit()
    return await get_role(db, role.id)


async def delete_role(db: AsyncSession, role_id: int) -> None:
    role = await get_role(db, role_id)
    if role.is_system:
        raise HTTPException(status_code=400, detail="System roles cannot be deleted")
    in_use = await role_usage(db, role_id)
    if in_use > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Role is assigned to {in_use} user(s); reassign them first",
        )
    await db.delete(role)
    await db.commit()
