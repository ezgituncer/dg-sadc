"""Working days endpoint tests."""
import pytest
from httpx import AsyncClient

from app.tests.conftest import auth, login_token


@pytest.mark.asyncio
async def test_default_22_days_per_month(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.get("/api/v1/working-days", headers=auth(token), params={"year": 2026})
    assert res.status_code == 200
    body = res.json()
    assert body["year"] == 2026
    assert body["months"] == [22] * 12


@pytest.mark.asyncio
async def test_admin_can_update(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    new_months = [22, 20, 22, 21, 22, 22, 22, 22, 21, 22, 22, 22]
    res = await client.patch(
        "/api/v1/working-days",
        headers=auth(token),
        params={"year": 2026},
        json={"months": new_months},
    )
    assert res.status_code == 200
    assert res.json()["months"] == new_months


@pytest.mark.asyncio
async def test_hr_cannot_update(client: AsyncClient) -> None:
    token = await login_token(client, "HR001", "hr123")
    res = await client.patch(
        "/api/v1/working-days",
        headers=auth(token),
        params={"year": 2026},
        json={"months": [22] * 12},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_hr_can_read(client: AsyncClient) -> None:
    token = await login_token(client, "HR001", "hr123")
    res = await client.get("/api/v1/working-days", headers=auth(token), params={"year": 2026})
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_manager_can_update(client: AsyncClient) -> None:
    token = await login_token(client, "MGR001", "mgr123")
    res = await client.patch(
        "/api/v1/working-days",
        headers=auth(token),
        params={"year": 2026},
        json={"months": [22] * 12},
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_worker_cannot_read(client: AsyncClient) -> None:
    token = await login_token(client, "EMP001", "pass123")
    res = await client.get("/api/v1/working-days", headers=auth(token), params={"year": 2026})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_invalid_value_rejected(client: AsyncClient) -> None:
    token = await login_token(client, "ADM001", "admin123")
    res = await client.patch(
        "/api/v1/working-days",
        headers=auth(token),
        params={"year": 2026},
        json={"months": [50] + [22] * 11},
    )
    assert res.status_code == 400
