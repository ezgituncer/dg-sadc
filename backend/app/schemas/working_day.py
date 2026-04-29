from pydantic import BaseModel, Field


class WorkingDaysResponse(BaseModel):
    year: int
    months: list[int] = Field(min_length=12, max_length=12)


class WorkingDaysUpdate(BaseModel):
    months: list[int] = Field(min_length=12, max_length=12)
