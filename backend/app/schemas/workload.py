from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


WorkStatus = Literal["ongoing", "completed", "blocked"]
Complexity = Literal["low", "medium", "high"]


class WorkloadEntryBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class WorkloadEntryCreate(WorkloadEntryBase):
    work_date: date
    activity_type_id: int = Field(ge=1)
    category_id: int = Field(ge=1)
    project_id: int | None = None
    task_type_id: int = Field(ge=1)
    task_description: str = Field(min_length=1, max_length=10000)
    status: WorkStatus
    complexity: Complexity
    quantity: int | None = Field(default=None, ge=0)
    hours_spent: Decimal = Field(gt=Decimal("0"), le=Decimal("999.99"))

    @model_validator(mode="after")
    def _check_project_consistency(self) -> "WorkloadEntryCreate":
        if self.activity_type_id == 1 and self.project_id is None:
            raise ValueError("project_id is required when activity_type=PROJECT")
        if self.activity_type_id in (2, 3) and self.project_id is not None:
            raise ValueError("project_id must be empty for non-project activities")
        return self

    @model_validator(mode="after")
    def _check_quarter_step(self) -> "WorkloadEntryCreate":
        # 0.25 increments — 25 cents per quarter
        cents = (self.hours_spent * 100).to_integral_value()
        if cents % 25 != 0:
            raise ValueError("hours_spent must be a multiple of 0.25")
        return self


class WorkloadEntryUpdate(WorkloadEntryBase):
    work_date: date | None = None
    activity_type_id: int | None = Field(default=None, ge=1)
    category_id: int | None = Field(default=None, ge=1)
    project_id: int | None = None
    task_type_id: int | None = Field(default=None, ge=1)
    task_description: str | None = Field(default=None, min_length=1, max_length=10000)
    status: WorkStatus | None = None
    complexity: Complexity | None = None
    quantity: int | None = Field(default=None, ge=0)
    hours_spent: Decimal | None = Field(default=None, gt=Decimal("0"), le=Decimal("999.99"))


class WorkloadEntryOut(WorkloadEntryBase):
    id: int
    account_id: str
    work_date: date
    activity_type_id: int
    category_id: int
    project_id: int | None
    task_type_id: int
    task_description: str
    status: WorkStatus
    complexity: Complexity
    quantity: int | None
    hours_spent: Decimal
    created_at: datetime
    updated_at: datetime


class WorkloadEntryListResponse(BaseModel):
    items: list[WorkloadEntryOut]
    total: int
    page: int
    page_size: int


class TrendPoint(BaseModel):
    date: date
    hours: Decimal


class ProjectAggregate(BaseModel):
    project_id: int | None
    name: str
    hours: Decimal


class ActivityAggregate(BaseModel):
    activity_type_id: int
    name: str
    hours: Decimal


class WorkloadAggregates(BaseModel):
    """Chart-ready aggregates for the workload listings page."""

    by_date: list[TrendPoint]
    by_project: list[ProjectAggregate]
    by_activity: list[ActivityAggregate]
    total_hours: Decimal
    total_entries: int
