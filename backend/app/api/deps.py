"""Reusable FastAPI dependencies — auth & RBAC."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.models import Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    account_id = payload.get("sub")
    if not account_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject"
        )

    user = (
        await db.execute(
            select(User)
            .where(User.account_id == account_id)
            .options(joinedload(User.role).selectinload(Role.permissions))
        )
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Account disabled"
        )
    return user


def has_permission(user: User, code: str) -> bool:
    """True if the user's role grants ``code`` (superuser roles grant everything)."""
    role = user.role
    if role is None:
        return False
    if role.is_superuser:
        return True
    return code in role.permission_codes


def require_permission(code: str):
    """Dependency factory: allow only users whose role grants permission ``code``."""

    async def _check(current: User = Depends(get_current_user)) -> User:
        if not has_permission(current, code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current

    return _check


def require_superuser(current: User = Depends(get_current_user)) -> User:
    """Allow only superuser roles (ADMIN) — e.g. resetting another user's password."""
    if not (current.role and current.role.is_superuser):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )
    return current


def require_role(*allowed_codes: str):
    """Dependency factory: only allow users whose role.code is in `allowed_codes`."""

    async def _check(current: User = Depends(get_current_user)) -> User:
        role_code = current.role.code if current.role else None
        if role_code not in allowed_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current

    return _check


def forbid_worker(current: User = Depends(get_current_user)) -> User:
    """Block users with role=WORKER from a route (used for users / lookups / reports)."""
    if current.role and current.role.code == "WORKER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workers cannot access this resource",
        )
    return current
