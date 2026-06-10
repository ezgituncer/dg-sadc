"""Auth endpoints — login & me."""
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import create_access_token, verify_password
from app.models import Role, User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
async def login(
    request: Request,
    payload: Annotated[LoginRequest, Body()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    user = (
        await db.execute(
            select(User)
            .where(User.email == payload.email.lower())
            .options(joinedload(User.role).selectinload(Role.permissions))
        )
    ).scalar_one_or_none()

    # Always run verify_password (even when user is None) so the timing of a
    # missing-email response matches a wrong-password response.
    candidate_hash = (
        user.password_hash
        if user is not None
        else "$2b$12$" + "x" * 53  # any bcrypt-shaped string
    )
    password_ok = verify_password(payload.password, candidate_hash)

    if user is None or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled",
        )

    token = create_access_token(subject=user.account_id)
    return TokenResponse(access_token=token, user=UserOut.from_model(user))


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)) -> UserOut:
    return UserOut.from_model(current)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout(_current: User = Depends(get_current_user)) -> Response:
    # Stateless JWT — the client just discards the token. The endpoint exists
    # so the frontend can hit a clean /auth/logout.
    return Response(status_code=status.HTTP_204_NO_CONTENT)
