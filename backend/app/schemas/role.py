from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None
    is_superuser: bool = False
    is_system: bool = False
    created_at: datetime

    # Effective permission codes attached to the role (superuser roles have all).
    permissions: list[str] = Field(default_factory=list)

    @classmethod
    def from_model(cls, role) -> "RoleOut":
        return cls(
            id=role.id,
            code=role.code,
            name=role.name,
            description=role.description,
            is_superuser=role.is_superuser,
            is_system=role.is_system,
            created_at=role.created_at,
            permissions=sorted(p.code for p in role.permissions),
        )


class RoleCreate(BaseModel):
    """Create a new (custom) role. `code` is auto-generated from the name when
    omitted; permissions are assigned by their string codes."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    permissions: list[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    """`code` is immutable. Name, description and the permission set are editable.
    Passing `permissions` replaces the role's full permission set."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    permissions: list[str] | None = None
