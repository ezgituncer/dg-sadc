"""Yearly report computation tests."""
from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.tests.conftest import auth, login_token


def _entry(work_date: date, *, activity_type_id: int = 1, hours: str = "4.0", project_id: int | None = 1, category_id: int = 1) -> dict:
    return {
        "work_date": work_date.isoformat(),
        "activity_type_id": activity_type_id,
        "category_id": category_id,
        "project_id": project_id,
        "task_type_id": 1,
        "task_description": "report-fixture",
        "status": "ongoing",
        "complexity": "medium",
        "hours_spent": hours,
    }


@pytest.mark.asyncio
async def test_worker_cannot_access_report(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.get("/api/v1/reports/yearly", headers=auth(token), params={"year": 2026})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_year_target_hours_uses_working_days(client: AsyncClient) -> None:
    admin = await login_token(client, "ADM001", "admin123")
    res = await client.get("/api/v1/reports/yearly", headers=auth(admin), params={"year": 2026})
    assert res.status_code == 200
    body = res.json()
    # Default 22 days × 12 months × 8 hours = 2112
    assert body["expected_working_days"] == [22] * 12
    assert Decimal(body["year_target_hours"]) == Decimal(2112)


@pytest.mark.asyncio
async def test_report_aggregates_hours_by_month_and_activity(client: AsyncClient) -> None:
    today = date.today()
    if today.year != 2026:
        pytest.skip("Test assumes year 2026 — adjust if calendar moves")

    worker = await login_token(client, "EMP001", "pass123")
    # Two PROJECT entries today (same month), one NON_PROJECT entry today.
    await client.post("/api/v1/workload-entries", headers=auth(worker), json=_entry(today, hours="2.5"))
    await client.post("/api/v1/workload-entries", headers=auth(worker), json=_entry(today, hours="1.5"))
    await client.post(
        "/api/v1/workload-entries",
        headers=auth(worker),
        json=_entry(today, activity_type_id=2, project_id=None, hours="1.0"),
    )

    admin = await login_token(client, "ADM001", "admin123")
    res = await client.get(
        "/api/v1/reports/yearly", headers=auth(admin), params={"year": 2026}
    )
    assert res.status_code == 200
    body = res.json()

    row = next(r for r in body["rows"] if r["user"]["account_id"] == "EMP001")
    month_idx = today.month - 1
    # 2.5 + 1.5 + 1.0 = 5.0 in this month
    assert Decimal(row["hours_by_month"][month_idx]) == Decimal("5.00")
    # Breakdown: activity 1 = 4.0, activity 2 = 1.0, activity 3 = 0
    bk = row["breakdown_by_activity"]
    assert Decimal(bk["1"][month_idx]) == Decimal("4.00")
    assert Decimal(bk["2"][month_idx]) == Decimal("1.00")
    assert Decimal(bk["3"][month_idx]) == Decimal("0")


@pytest.mark.asyncio
async def test_team_filter(client: AsyncClient) -> None:
    admin = await login_token(client, "ADM001", "admin123")
    res = await client.get(
        "/api/v1/reports/yearly",
        headers=auth(admin),
        params={"year": 2026, "team_id": 4},  # QA team
    )
    assert res.status_code == 200
    body = res.json()
    # Every row's user should belong to a QA team — assert by checking each user shown.
    teams_in_rows = {r["user"]["team"] for r in body["rows"]}
    assert teams_in_rows.issubset({"QA"})


@pytest.mark.asyncio
async def test_include_breakdown_false(client: AsyncClient) -> None:
    admin = await login_token(client, "ADM001", "admin123")
    res = await client.get(
        "/api/v1/reports/yearly",
        headers=auth(admin),
        params={"year": 2026, "include_breakdown": False},
    )
    assert res.status_code == 200
    body = res.json()
    if body["rows"]:
        assert body["rows"][0]["breakdown_by_activity"] == {}
