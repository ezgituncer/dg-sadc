"""Yearly report endpoint — non-WORKER only."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import forbid_worker
from app.core.database import get_db
from app.models import User
from app.schemas.report import YearlyReport
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/yearly", response_model=YearlyReport)
async def yearly_report(
    year: int = Query(..., ge=2000, le=2100),
    team_id: int | None = Query(default=None),
    project_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    include_breakdown: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(forbid_worker),
) -> YearlyReport:
    return await report_service.build_yearly_report(
        db,
        year=year,
        team_id=team_id,
        project_id=project_id,
        search=search,
        include_breakdown=include_breakdown,
    )
