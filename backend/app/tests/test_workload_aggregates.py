"""Aggregate endpoint tests for the listings page charts."""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.tests.conftest import auth, login_token


def _entry(work_date: date, **overrides) -> dict:
    base = {
        "work_date": work_date.isoformat(),
        "activity_type_id": 1,
        "category_id": 1,
        "project_id": 1,
        "task_type_id": 1,
        "task_description": "agg-test",
        "status": "ongoing",
        "complexity": "medium",
        "hours_spent": "2.0",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_aggregates_empty_when_no_entries(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.get("/api/v1/workload-entries/aggregates", headers=auth(token))
    assert res.status_code == 200
    body = res.json()
    assert body["by_project"] == []
    assert body["by_activity"] == []
    assert Decimal(body["total_hours"]) == Decimal(0)
    assert body["total_entries"] == 0


@pytest.mark.asyncio
async def test_aggregates_group_by_activity_and_project(client: AsyncClient) -> None:
    worker = await login_token(client, "EMP001", "pass123")
    today = date.today()
    # 2 PROJECT entries (project=1 / 4h total) and 1 NON_PROJECT (1h)
    await client.post("/api/v1/workload-entries", headers=auth(worker), json=_entry(today, hours_spent="2.5"))
    await client.post("/api/v1/workload-entries", headers=auth(worker), json=_entry(today, hours_spent="1.5"))
    await client.post(
        "/api/v1/workload-entries",
        headers=auth(worker),
        json=_entry(today, activity_type_id=2, project_id=None, hours_spent="1.0"),
    )

    admin = await login_token(client, "ADM001", "admin123")
    res = await client.get("/api/v1/workload-entries/aggregates", headers=auth(admin))
    assert res.status_code == 200
    body = res.json()

    assert Decimal(body["total_hours"]) == Decimal("5.00")
    assert body["total_entries"] == 3

    # Activity sums
    by_act = {a["activity_type_id"]: Decimal(a["hours"]) for a in body["by_activity"]}
    assert by_act[1] == Decimal("4.00")
    assert by_act[2] == Decimal("1.00")

    # Project sums (project=1 has 4h, NULL project has 1h)
    by_proj = {p["project_id"]: Decimal(p["hours"]) for p in body["by_project"]}
    assert by_proj[1] == Decimal("4.00")
    assert by_proj.get(None) == Decimal("1.00")


@pytest.mark.asyncio
async def test_aggregates_fill_missing_dates_in_range(client: AsyncClient) -> None:
    worker = await login_token(client, "EMP001", "pass123")
    today = date.today()
    yesterday = today - timedelta(days=1)
    # Only an entry today, nothing yesterday
    await client.post("/api/v1/workload-entries", headers=auth(worker), json=_entry(today, hours_spent="3.0"))

    res = await client.get(
        "/api/v1/workload-entries/aggregates",
        headers=auth(worker),
        params={
            "date_from": yesterday.isoformat(),
            "date_to": today.isoformat(),
        },
    )
    assert res.status_code == 200
    series = res.json()["by_date"]
    assert len(series) == 2
    # Both days are present even though yesterday has no entries
    assert series[0]["date"] == yesterday.isoformat()
    assert Decimal(series[0]["hours"]) == Decimal(0)
    assert series[1]["date"] == today.isoformat()
    assert Decimal(series[1]["hours"]) == Decimal("3.00")


@pytest.mark.asyncio
async def test_aggregates_respect_filters(client: AsyncClient) -> None:
    worker = await login_token(client, "EMP001", "pass123")
    today = date.today()
    await client.post("/api/v1/workload-entries", headers=auth(worker), json=_entry(today, hours_spent="2.0"))
    await client.post(
        "/api/v1/workload-entries",
        headers=auth(worker),
        json=_entry(today, activity_type_id=2, project_id=None, hours_spent="1.5"),
    )

    # Filter to only project activities → second entry should be excluded
    res = await client.get(
        "/api/v1/workload-entries/aggregates",
        headers=auth(worker),
        params={"activity_type_id": 1},
    )
    body = res.json()
    assert Decimal(body["total_hours"]) == Decimal("2.00")
    assert body["total_entries"] == 1
    assert len(body["by_activity"]) == 1
    assert body["by_activity"][0]["activity_type_id"] == 1
