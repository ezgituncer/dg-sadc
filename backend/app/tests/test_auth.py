"""Auth endpoint tests."""
import pytest
from httpx import AsyncClient

from app.tests.conftest import auth, login_token


@pytest.mark.asyncio
async def test_login_with_correct_credentials_returns_token(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.com", "password": "admin123"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["account_id"] == "ADM001"
    assert body["user"]["role_code"] == "ADMIN"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.com", "password": "WRONG"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@company.com", "password": "anything"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user_returns_401(client: AsyncClient) -> None:
    admin = await login_token(client, "admin@company.com", "admin123")
    # Find EMP001's id via the API.
    users_res = await client.get("/api/v1/users", headers=auth(admin))
    user_id = next(u["id"] for u in users_res.json() if u["account_id"] == "EMP001")

    deactivate = await client.delete(f"/api/v1/users/{user_id}", headers=auth(admin))
    assert deactivate.status_code == 200, deactivate.text

    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "developer1@company.com", "password": "pass123"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_token(client: AsyncClient) -> None:
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_user(client: AsyncClient) -> None:
    token = await login_token(client, "admin@company.com", "admin123")
    res = await client.get("/api/v1/auth/me", headers=auth(token))
    assert res.status_code == 200
    body = res.json()
    assert body["account_id"] == "ADM001"
    assert body["email"] == "admin@company.com"


@pytest.mark.asyncio
async def test_invalid_token_returns_401(client: AsyncClient) -> None:
    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.real.token"},
    )
    assert res.status_code == 401
