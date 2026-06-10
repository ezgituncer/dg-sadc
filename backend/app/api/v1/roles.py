"""Roles — full CRUD + permission assignment.

Roles are collections of permissions (app.core.permissions catalog). Listing /
reading is open to any authenticated user (the user form needs the role dropdown);
creating, editing and deleting require the ``roles.manage`` permission. The ADMIN
role is a superuser and the six seeded roles are system roles (cannot be deleted).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_permission
from app.core.database import get_db
from app.core.permissions import ROLES_MANAGE
from app.models import Permission, User
from app.schemas.lookup import UsageCount
from app.schemas.permission import PermissionOut
from app.schemas.role import RoleCreate, RoleOut, RoleUpdate
from app.services import role_service

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleOut])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[RoleOut]:
    roles = await role_service.list_roles(db)
    return [RoleOut.from_model(r) for r in roles]


@router.get("/permissions", response_model=list[PermissionOut])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Permission]:
    """The full permission catalog (grouped by feature on the client)."""
    rows = (
        await db.execute(select(Permission).order_by(Permission.feature, Permission.kind))
    ).scalars().all()
    return list(rows)


@router.get("/{item_id}", response_model=RoleOut)
async def get_role(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> RoleOut:
    role = await role_service.get_role(db, item_id)
    return RoleOut.from_model(role)


@router.get("/{item_id}/usage", response_model=UsageCount)
async def role_usage(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(ROLES_MANAGE)),
) -> UsageCount:
    return UsageCount(count=await role_service.role_usage(db, item_id))


@router.post("", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(ROLES_MANAGE)),
) -> RoleOut:
    role = await role_service.create_role(db, payload)
    return RoleOut.from_model(role)


@router.patch("/{item_id}", response_model=RoleOut)
async def update_role(
    item_id: int,
    payload: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(ROLES_MANAGE)),
) -> RoleOut:
    role = await role_service.update_role(db, item_id, payload)
    return RoleOut.from_model(role)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_role(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(ROLES_MANAGE)),
) -> Response:
    await role_service.delete_role(db, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
