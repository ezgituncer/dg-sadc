from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.schemas.role import RoleOut

AccountId = Annotated[str, StringConstraints(min_length=1, max_length=20, pattern=r"^[A-Z0-9_-]+$")]


class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    role_id: int
    position_id: int | None = None
    team_id: int | None = None
    manager_account_id: AccountId | None = None


class UserCreate(UserBase):
    account_id: AccountId
    password: str = Field(min_length=6, max_length=128)
    is_active: bool = True


class UserUpdate(BaseModel):
    """Partial update; account_id is intentionally not present (immutable)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    role_id: int | None = None
    position_id: int | None = None
    team_id: int | None = None
    manager_account_id: AccountId | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: str
    email: EmailStr
    name: str
    is_active: bool
    role_id: int
    role_code: str | None = None
    position_id: int | None
    position_name: str | None = None
    team_id: int | None
    manager_account_id: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            account_id=user.account_id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            role_id=user.role_id,
            role_code=user.role.code if user.role else None,
            position_id=user.position_id,
            position_name=user.position.name if user.position else None,
            team_id=user.team_id,
            manager_account_id=user.manager_account_id,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )


class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)


class UserDirectoryEntry(BaseModel):
    """Minimal user info — used by every authenticated client (incl. WORKERs)
    to render names alongside account IDs anywhere in the UI."""

    model_config = ConfigDict(from_attributes=True)

    account_id: str
    name: str
    role_code: str | None = None
    position_id: int | None = None
    position_name: str | None = None
    team_id: int | None = None

    @classmethod
    def from_model(cls, user) -> "UserDirectoryEntry":
        return cls(
            account_id=user.account_id,
            name=user.name,
            role_code=user.role.code if user.role else None,
            position_id=user.position_id,
            position_name=user.position.name if user.position else None,
            team_id=user.team_id,
        )
