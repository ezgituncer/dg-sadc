"""Generic CRUD schemas reused by every lookup table.

The 8 lookup-style tables (activity_types, projects, task_types, project_categories,
non_project_categories, self_imp_categories) share most fields. Code is immutable
on update; the regex `^[A-Z0-9_-]+$` is enforced via Pydantic at the API boundary.
"""
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

LookupCode = Annotated[
    str,
    StringConstraints(min_length=1, max_length=50, pattern=r"^[A-Z0-9_-]+$"),
]


class LookupBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class LookupCreate(LookupBase):
    code: LookupCode
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)


class LookupUpdate(LookupBase):
    """Code is intentionally absent — it is immutable."""

    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class LookupOut(LookupBase):
    id: int
    code: str
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# --- Category variants (color is required) -----------------------------------

class CategoryCreate(LookupBase):
    code: LookupCode
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=1, max_length=20)


class CategoryUpdate(LookupBase):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, min_length=1, max_length=20)
    is_active: bool | None = None


class CategoryOut(LookupBase):
    id: int
    code: str
    name: str
    color: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


# --- TaskType (no description in the schema, name only) ----------------------

class TaskTypeCreate(LookupBase):
    code: LookupCode
    name: str = Field(min_length=1, max_length=100)


class TaskTypeUpdate(LookupBase):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None


class TaskTypeOut(LookupBase):
    id: int
    code: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


# --- Usage count -------------------------------------------------------------

class UsageCount(BaseModel):
    count: int
