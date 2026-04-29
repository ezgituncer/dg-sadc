"""Yearly workload report — aggregated in a single SQL query, GROUP BY year/month/activity."""
from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Team, User, WorkloadEntry
from app.schemas.report import YearlyReport, YearlyReportRow, YearlyReportUserInfo
from app.services import working_day_service

ACTIVITY_IDS = (1, 2, 3)
HOURS_PER_WORKING_DAY = 8


async def build_yearly_report(
    db: AsyncSession,
    *,
    year: int,
    team_id: int | None = None,
    project_id: int | None = None,
    search: str | None = None,
    include_breakdown: bool = True,
) -> YearlyReport:
    expected = await working_day_service.get_year(db, year)
    year_target_hours = Decimal(sum(expected) * HOURS_PER_WORKING_DAY)

    # --- Active users ---------------------------------------------------------
    user_stmt = select(User).where(User.is_active.is_(True))
    if team_id is not None:
        user_stmt = user_stmt.where(User.team_id == team_id)
    if search:
        like = f"%{search.strip()}%"
        user_stmt = user_stmt.where(
            (User.name.ilike(like)) | (User.account_id.ilike(like)) | (User.email.ilike(like))
        )
    users = list((await db.execute(user_stmt.order_by(User.name))).scalars().all())
    user_by_account = {u.account_id: u for u in users}

    teams = {t.id: t for t in (await db.execute(select(Team))).scalars().all()}

    # --- Aggregated entries ---------------------------------------------------
    month_col = extract("month", WorkloadEntry.work_date).label("month")
    agg_stmt = (
        select(
            WorkloadEntry.account_id,
            month_col,
            WorkloadEntry.activity_type_id,
            func.coalesce(func.sum(WorkloadEntry.hours_spent), 0).label("hours"),
        )
        .where(extract("year", WorkloadEntry.work_date) == year)
        .group_by(
            WorkloadEntry.account_id,
            month_col,
            WorkloadEntry.activity_type_id,
        )
    )

    if project_id is not None:
        agg_stmt = agg_stmt.where(WorkloadEntry.project_id == project_id)

    if user_by_account:
        agg_stmt = agg_stmt.where(WorkloadEntry.account_id.in_(list(user_by_account.keys())))
    else:
        # No matching users → no data. Short-circuit.
        return YearlyReport(
            year=year,
            expected_working_days=expected,
            year_target_hours=year_target_hours,
            rows=[],
            column_totals=[Decimal(0)] * 12,
            grand_total=Decimal(0),
        )

    # account → month_index → hours
    monthly: dict[str, list[Decimal]] = {
        a: [Decimal(0)] * 12 for a in user_by_account
    }
    # account → activity → month_index → hours
    breakdown: dict[str, dict[int, list[Decimal]]] = {
        a: {act: [Decimal(0)] * 12 for act in ACTIVITY_IDS} for a in user_by_account
    }

    rows = (await db.execute(agg_stmt)).all()
    for account_id, month, activity_id, hours in rows:
        idx = int(month) - 1
        h = Decimal(hours)
        if account_id not in monthly:
            continue
        monthly[account_id][idx] += h
        if activity_id in breakdown[account_id]:
            breakdown[account_id][activity_id][idx] += h

    # --- Build response rows --------------------------------------------------
    out_rows: list[YearlyReportRow] = []
    column_totals = [Decimal(0)] * 12
    grand_total = Decimal(0)

    for u in users:
        months_arr = monthly[u.account_id]
        year_total = sum(months_arr, start=Decimal(0))

        bk: dict[str, list[Decimal]] = {}
        if include_breakdown:
            bk = {str(act): breakdown[u.account_id][act] for act in ACTIVITY_IDS}

        for i in range(12):
            column_totals[i] += months_arr[i]
        grand_total += year_total

        team_name = teams[u.team_id].name if u.team_id and u.team_id in teams else None
        out_rows.append(
            YearlyReportRow(
                user=YearlyReportUserInfo(
                    account_id=u.account_id,
                    name=u.name,
                    team=team_name,
                ),
                hours_by_month=months_arr,
                year_total=year_total,
                breakdown_by_activity=bk,
            )
        )

    return YearlyReport(
        year=year,
        expected_working_days=expected,
        year_target_hours=year_target_hours,
        rows=out_rows,
        column_totals=column_totals,
        grand_total=grand_total,
    )
