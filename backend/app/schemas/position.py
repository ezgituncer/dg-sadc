from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PositionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    parent_position_id: int | None = None
    description: str | None = Field(default=None, max_length=255)


class PositionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    parent_position_id: int | None = None
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class PositionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_position_id: int | None
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
