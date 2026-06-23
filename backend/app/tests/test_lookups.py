"""Lookup CRUD tests — projects + project-categories cover the generic pattern."""
import pytest
from httpx import AsyncClient

from app.tests.conftest import auth, login_token


@pytest.mark.asyncio
async def test_lookup_list_visible_to_worker(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.get("/api/v1/projects", headers=auth(token))
    assert res.status_code == 200
    assert len(res.json()) == 5


@pytest.mark.asyncio
async def test_worker_cannot_create_lookup(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.post(
        "/api/v1/projects",
        headers=auth(token),
        json={"code": "NEW", "name": "X"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_creates_then_updates_then_deletes(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")

    create = await client.post(
        "/api/v1/projects",
        headers=auth(token),
        json={"code": "NEW", "name": "New Project", "description": "x"},
    )
    assert create.status_code == 201
    pid = create.json()["id"]

    update = await client.patch(
        f"/api/v1/projects/{pid}",
        headers=auth(token),
        json={"name": "Renamed"},
    )
    assert update.status_code == 200
    assert update.json()["name"] == "Renamed"
    assert update.json()["code"] == "NEW"  # immutable

    delete = await client.delete(f"/api/v1/projects/{pid}", headers=auth(token))
    assert delete.status_code == 200
    assert delete.json()["is_active"] is False

    activate = await client.post(f"/api/v1/projects/{pid}/activate", headers=auth(token))
    assert activate.status_code == 200
    assert activate.json()["is_active"] is True


@pytest.mark.asyncio
async def test_code_regex_enforced(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/projects",
        headers=auth(token),
        json={"code": "lower-case", "name": "X"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_duplicate_code_rejected(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/projects",
        headers=auth(token),
        json={"code": "ATLAS", "name": "X"},  # already seeded
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_category_with_color(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/project-categories",
        headers=auth(token),
        json={"code": "MOBILE", "name": "Mobile", "color": "#123456"},
    )
    assert res.status_code == 201
    assert res.json()["color"] == "#123456"


@pytest.mark.asyncio
async def test_usage_count(client: AsyncClient) -> None:
    """Create an entry referencing project 1, then check usage count."""
    from datetime import date

    worker = await login_token(client, "EMP001", "pass123")
    create = await client.post(
        "/api/v1/workload-entries",
        headers=auth(worker),
        json={
            "work_date": date.today().isoformat(),
            "activity_type_id": 1,
            "category_id": 1,
            "project_id": 1,
            "task_type_id": 1,
            "task_description": "x",
            "status": "ongoing",
            "complexity": "low",
            "hours_spent": "1.0",
        },
    )
    assert create.status_code == 201, create.text

    admin = await login_token(client, "ADM001", "admin123")
    res = await client.get("/api/v1/projects/1/usage", headers=auth(admin))
    assert res.status_code == 200
    assert res.json()["count"] >= 1
