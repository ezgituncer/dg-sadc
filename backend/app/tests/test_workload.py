"""Workload entry endpoint tests."""
from datetime import date, timedelta

import pytest
from httpx import AsyncClient

from app.tests.conftest import auth, login_token


def _entry_payload(**overrides) -> dict:
    today = date.today().isoformat()
    base = {
        "work_date": today,
        "activity_type_id": 1,
        "category_id": 1,
        "project_id": 1,
        "task_type_id": 1,
        "task_description": "Test entry",
        "status": "ongoing",
        "complexity": "medium",
        "hours_spent": "2.5",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_worker_can_create_own_entry(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.post(
        "/api/v1/workload-entries", headers=auth(token), json=_entry_payload()
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["account_id"] == "EMP001"
    assert body["hours_spent"] == "2.50"


@pytest.mark.asyncio
async def test_account_id_in_body_is_ignored(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    payload = _entry_payload()
    payload["account_id"] = "ADM001"  # try to spoof — should be ignored
    res = await client.post("/api/v1/workload-entries", headers=auth(token), json=payload)
    assert res.status_code == 201
    assert res.json()["account_id"] == "EMP001"


@pytest.mark.asyncio
async def test_future_date_rejected(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    future = (date.today() + timedelta(days=1)).isoformat()
    res = await client.post(
        "/api/v1/workload-entries",
        headers=auth(token),
        json=_entry_payload(work_date=future),
    )
    assert res.status_code == 400
    assert "future" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_date_older_than_window_rejected(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    too_old = (date.today() - timedelta(days=33)).isoformat()
    res = await client.post(
        "/api/v1/workload-entries",
        headers=auth(token),
        json=_entry_payload(work_date=too_old),
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_project_required_when_activity_is_project(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.post(
        "/api/v1/workload-entries",
        headers=auth(token),
        json=_entry_payload(project_id=None),
    )
    assert res.status_code == 422  # pydantic model_validator


@pytest.mark.asyncio
async def test_project_forbidden_for_non_project_activity(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.post(
        "/api/v1/workload-entries",
        headers=auth(token),
        json=_entry_payload(activity_type_id=2, category_id=1, project_id=1),
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_hours_must_be_quarter_step(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.post(
        "/api/v1/workload-entries",
        headers=auth(token),
        json=_entry_payload(hours_spent="2.10"),
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_user_cannot_edit_other_users_entry(client: AsyncClient) -> None:
    # Worker A creates an entry
    a = await login_token(client, "EMP001", "pass123")
    create = await client.post("/api/v1/workload-entries", headers=auth(a), json=_entry_payload())
    entry_id = create.json()["id"]

    # Worker B tries to edit it
    b = await login_token(client, "EMP002", "pass123")
    edit = await client.patch(
        f"/api/v1/workload-entries/{entry_id}",
        headers=auth(b),
        json={"task_description": "hijacked"},
    )
    assert edit.status_code == 403


@pytest.mark.asyncio
async def test_admin_cannot_edit_others_entry(client: AsyncClient) -> None:
    a = await login_token(client, "EMP001", "pass123")
    create = await client.post("/api/v1/workload-entries", headers=auth(a), json=_entry_payload())
    entry_id = create.json()["id"]

    admin = await login_token(client, "ADM001", "admin123")
    edit = await client.patch(
        f"/api/v1/workload-entries/{entry_id}",
        headers=auth(admin),
        json={"task_description": "admin override"},
    )
    assert edit.status_code == 403


@pytest.mark.asyncio
async def test_owner_can_edit_and_delete(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    create = await client.post(
        "/api/v1/workload-entries", headers=auth(token), json=_entry_payload()
    )
    entry_id = create.json()["id"]

    edit = await client.patch(
        f"/api/v1/workload-entries/{entry_id}",
        headers=auth(token),
        json={"task_description": "edited"},
    )
    assert edit.status_code == 200
    assert edit.json()["task_description"] == "edited"

    delete = await client.delete(
        f"/api/v1/workload-entries/{entry_id}", headers=auth(token)
    )
    assert delete.status_code == 204


@pytest.mark.asyncio
async def test_worker_sees_only_own_entries(client: AsyncClient) -> None:
    # A worker's listing is scoped to their own entries — never anyone else's.
    a = await login_token(client, "EMP001", "pass123")
    await client.post("/api/v1/workload-entries", headers=auth(a), json=_entry_payload())

    b = await login_token(client, "EMP002", "pass123")
    await client.post("/api/v1/workload-entries", headers=auth(b), json=_entry_payload())
    res = await client.get("/api/v1/workload-entries", headers=auth(b))
    assert res.status_code == 200
    items = res.json()["items"]
    assert items, "worker should see their own entry"
    assert all(e["account_id"] == "EMP002" for e in items)


@pytest.mark.asyncio
async def test_filter_by_account_id(client: AsyncClient) -> None:
    a = await login_token(client, "EMP001", "pass123")
    await client.post("/api/v1/workload-entries", headers=auth(a), json=_entry_payload())

    res = await client.get(
        "/api/v1/workload-entries", headers=auth(a), params={"account_id": "EMP001"}
    )
    assert res.status_code == 200
    assert all(e["account_id"] == "EMP001" for e in res.json()["items"])
