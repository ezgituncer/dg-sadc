"""Users CRUD tests."""
import pytest
from httpx import AsyncClient

from app.tests.conftest import auth, login_token


@pytest.mark.asyncio
async def test_worker_cannot_list_users(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.get("/api/v1/users", headers=auth(token))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_lists_users(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.get("/api/v1/users", headers=auth(token))
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 19
    assert all(u["is_active"] for u in items)


@pytest.mark.asyncio
async def test_create_user_happy_path(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/users",
        headers=auth(token),
        json={
            "account_id": "EMP500",
            "email": "newperson@company.com",
            "name": "New Person",
            "password": "abc123",
            "role_id": 6,
            "team_id": 1,
            "manager_account_id": "MGR001",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["account_id"] == "EMP500"
    assert body["role_code"] == "WORKER"


@pytest.mark.asyncio
async def test_worker_cannot_report_to_another_worker(client: AsyncClient) -> None:
    # Position 14 (Senior Frontend Developer) reports to Engineering Manager (or
    # above). EMP001 is a developer, not an ancestor position → rejected.
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/users",
        headers=auth(token),
        json={
            "account_id": "EMP501",
            "email": "bad@company.com",
            "name": "Bad",
            "password": "abc123",
            "role_id": 6,
            "position_id": 14,
            "team_id": 1,
            "manager_account_id": "EMP001",  # EMP001 is a WORKER (developer)
        },
    )
    assert res.status_code == 400
    assert "manager" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_positioned_user_must_have_manager(client: AsyncClient) -> None:
    # A non-root position (parent = Engineering Manager) requires a manager.
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/users",
        headers=auth(token),
        json={
            "account_id": "EMP502",
            "email": "x@company.com",
            "name": "X",
            "password": "abc123",
            "role_id": 6,
            "position_id": 14,
            "team_id": 1,
        },
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_duplicate_account_id_rejected(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/users",
        headers=auth(token),
        json={
            "account_id": "EMP001",
            "email": "totally.new@company.com",
            "name": "X",
            "password": "abc123",
            "role_id": 6,
            "team_id": 1,
            "manager_account_id": "MGR001",
        },
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_duplicate_email_rejected(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/users",
        headers=auth(token),
        json={
            "account_id": "EMP503",
            "email": "admin@company.com",
            "name": "X",
            "password": "abc123",
            "role_id": 6,
            "team_id": 1,
            "manager_account_id": "MGR001",
        },
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_cannot_deactivate_self(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.patch(
        "/api/v1/users/1",
        headers=auth(token),
        json={"is_active": False},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_admin_can_reset_password(client: AsyncClient) -> None:
    admin = await login_token(client, "ADM001", "admin123")
    res = await client.post(
        "/api/v1/users/12/reset-password",
        headers=auth(admin),
        json={"new_password": "rotated"},
    )
    assert res.status_code == 204


@pytest.mark.asyncio
async def test_manager_cannot_reset_non_report_password(client: AsyncClient) -> None:
    # MGR001 is not in the admin's manager chain → cannot reset the admin (id 1).
    mgr = await login_token(client, "MGR001", "mgr123")
    res = await client.post(
        "/api/v1/users/1/reset-password",
        headers=auth(mgr),
        json={"new_password": "rotated"},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_manager_can_reset_own_report_password(client: AsyncClient) -> None:
    # A manager may reset the password of anyone who reports to them.
    admin = await login_token(client, "ADM001", "admin123")
    users = (await client.get("/api/v1/users", headers=auth(admin))).json()
    report = next(u for u in users if u["manager_account_id"] == "MGR001")
    mgr = await login_token(client, "MGR001", "mgr123")
    res = await client.post(
        f"/api/v1/users/{report['id']}/reset-password",
        headers=auth(mgr),
        json={"new_password": "rotated"},
    )
    assert res.status_code == 204


@pytest.mark.asyncio
async def test_cannot_delete_manager_with_active_reports(client: AsyncClient) -> None:
    admin = await login_token(client, "ADM001", "admin123")
    # MGR001 (id=5) has many reports
    res = await client.delete("/api/v1/users/5", headers=auth(admin))
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_soft_delete_then_activate(client: AsyncClient) -> None:
    admin = await login_token(client, "ADM001", "admin123")
    # EMP010 (id=19, no reports) — Sema Tekin
    delete_res = await client.delete("/api/v1/users/19", headers=auth(admin))
    assert delete_res.status_code == 200
    assert delete_res.json()["is_active"] is False

    activate_res = await client.post("/api/v1/users/19/activate", headers=auth(admin))
    assert activate_res.status_code == 200
    assert activate_res.json()["is_active"] is True


@pytest.mark.asyncio
async def test_directory_visible_to_workers(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.get("/api/v1/users/directory", headers=auth(token))
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 19
    # Directory payload — minimal identity + org-chart fields (used by the dashboard).
    assert set(items[0].keys()) == {
        "account_id",
        "name",
        "role_code",
        "position_id",
        "position_name",
        "team_id",
        "manager_account_id",
    }
    # Names from the seed are present
    names = {i["name"] for i in items}
    assert "Ayşe Yılmaz" in names
    assert "Hakan Yıldız" in names


@pytest.mark.asyncio
async def test_filter_by_role(client: AsyncClient) -> None:
    admin = await login_token(client, "ADM001", "admin123")
    res = await client.get("/api/v1/users", headers=auth(admin), params={"role_id": 6})
    assert res.status_code == 200
    items = res.json()
    assert all(u["role_id"] == 6 for u in items)
    assert len(items) >= 7
