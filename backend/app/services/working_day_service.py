"""Working days helper — 12-element array per year, default 22 per month."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ExpectedWorkingDay

DEFAULT_WORKING_DAYS_PER_MONTH = 22


async def get_year(db: AsyncSession, year: int) -> list[int]:
    rows = (
        await db.execute(
            select(ExpectedWorkingDay).where(ExpectedWorkingDay.year == year)
        )
    ).scalars().all()
    months = [DEFAULT_WORKING_DAYS_PER_MONTH] * 12
    for r in rows:
        months[r.month - 1] = r.working_days
    return months


async def upsert_year(
    db: AsyncSession,
    year: int,
    months: list[int],
    *,
    actor_account_id: str | None = None,
) -> list[int]:
    if len(months) != 12:
        raise ValueError("months must have exactly 12 entries")

    existing = {
        r.month: r
        for r in (
            await db.execute(
                select(ExpectedWorkingDay).where(ExpectedWorkingDay.year == year)
            )
        ).scalars().all()
    }

    for idx, value in enumerate(months, start=1):
        if value < 0 or value > 31:
            raise ValueError(f"month {idx}: working_days must be in [0, 31]")
        if idx in existing:
            existing[idx].working_days = value
            existing[idx].updated_by_account_id = actor_account_id
        else:
            db.add(
                ExpectedWorkingDay(
                    year=year,
                    month=idx,
                    working_days=value,
                    updated_by_account_id=actor_account_id,
                )
            )

    await db.flush()
    return await get_year(db, year)
