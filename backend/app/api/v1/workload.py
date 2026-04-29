"""Workload entry endpoints."""
from __future__ import annotations

import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.workload import (
    WorkloadAggregates,
    WorkloadEntryCreate,
    WorkloadEntryListResponse,
    WorkloadEntryOut,
    WorkloadEntryUpdate,
)
from app.services import workload_service

router = APIRouter(prefix="/workload-entries", tags=["workload"])


@router.get("", response_model=WorkloadEntryListResponse)
async def list_workload_entries(
    account_id: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    project_id: int | None = Query(default=None),
    activity_type_id: int | None = Query(default=None),
    task_type_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    complexity: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort: str = Query(default="work_date"),
    direction: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> WorkloadEntryListResponse:
    items, total = await workload_service.list_entries(
        db,
        account_id=account_id,
        date_from=date_from,
        date_to=date_to,
        project_id=project_id,
        activity_type_id=activity_type_id,
        task_type_id=task_type_id,
        status=status,
        complexity=complexity,
        search=search,
        sort=sort,
        direction=direction,
        page=page,
        page_size=page_size,
    )
    return WorkloadEntryListResponse(
        items=[WorkloadEntryOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/export")
async def export_workload_entries(
    account_id: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    project_id: int | None = Query(default=None),
    activity_type_id: int | None = Query(default=None),
    task_type_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    complexity: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Pull everything in one shot — capped at 5000 rows for sanity.
    items, _total = await workload_service.list_entries(
        db,
        account_id=account_id,
        date_from=date_from,
        date_to=date_to,
        project_id=project_id,
        activity_type_id=activity_type_id,
        task_type_id=task_type_id,
        status=status,
        complexity=complexity,
        search=search,
        page=1,
        page_size=5000,
    )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "account_id",
            "work_date",
            "activity_type_id",
            "category_id",
            "project_id",
            "task_type_id",
            "task_description",
            "status",
            "complexity",
            "quantity",
            "hours_spent",
        ]
    )
    for e in items:
        writer.writerow(
            [
                e.id,
                e.account_id,
                e.work_date.isoformat(),
                e.activity_type_id,
                e.category_id,
                e.project_id or "",
                e.task_type_id,
                e.task_description.replace("\n", " "),
                e.status,
                e.complexity,
                e.quantity if e.quantity is not None else "",
                str(e.hours_spent),
            ]
        )

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="workload-entries.csv"'},
    )


@router.get("/aggregates", response_model=WorkloadAggregates)
async def workload_aggregates(
    account_id: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    project_id: int | None = Query(default=None),
    activity_type_id: int | None = Query(default=None),
    task_type_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    complexity: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> WorkloadAggregates:
    data = await workload_service.aggregates(
        db,
        account_id=account_id,
        date_from=date_from,
        date_to=date_to,
        project_id=project_id,
        activity_type_id=activity_type_id,
        task_type_id=task_type_id,
        status=status,
        complexity=complexity,
        search=search,
    )
    return WorkloadAggregates(**data)


@router.get("/{entry_id}", response_model=WorkloadEntryOut)
async def get_workload_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> WorkloadEntryOut:
    entry = await workload_service.get_entry(db, entry_id)
    return WorkloadEntryOut.model_validate(entry)


@router.post("", response_model=WorkloadEntryOut, status_code=status.HTTP_201_CREATED)
async def create_workload_entry(
    payload: WorkloadEntryCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> WorkloadEntryOut:
    entry = await workload_service.create_entry(db, payload, actor=actor)
    await db.commit()
    return WorkloadEntryOut.model_validate(entry)


@router.patch("/{entry_id}", response_model=WorkloadEntryOut)
async def update_workload_entry(
    entry_id: int,
    payload: WorkloadEntryUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> WorkloadEntryOut:
    entry = await workload_service.update_entry(db, entry_id, payload, actor=actor)
    await db.commit()
    return WorkloadEntryOut.model_validate(entry)


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_workload_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> Response:
    await workload_service.delete_entry(db, entry_id, actor=actor)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
