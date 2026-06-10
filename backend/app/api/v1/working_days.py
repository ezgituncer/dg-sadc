"""Expected working days per (year, month) — admin/manager/tech_lead/qa edit, HR read-only."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import YEARLY_REPORT_MANAGE, YEARLY_REPORT_VIEW
from app.models import User
from app.schemas.working_day import WorkingDaysResponse, WorkingDaysUpdate
from app.services import working_day_service

router = APIRouter(prefix="/working-days", tags=["working-days"])


@router.get("", response_model=WorkingDaysResponse)
async def get_working_days(
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(YEARLY_REPORT_VIEW)),
) -> WorkingDaysResponse:
    months = await working_day_service.get_year(db, year)
    return WorkingDaysResponse(year=year, months=months)


@router.patch("", response_model=WorkingDaysResponse)
async def update_working_days(
    payload: WorkingDaysUpdate,
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_permission(YEARLY_REPORT_MANAGE)),
) -> WorkingDaysResponse:
    try:
        months = await working_day_service.upsert_year(
            db, year, payload.months, actor_account_id=actor.account_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await db.commit()
    return WorkingDaysResponse(year=year, months=months)
