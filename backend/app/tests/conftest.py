"""Shared pytest fixtures.

The test DB is rebuilt from scratch via Alembic at the start of every session,
so we exercise the same migration path production will. Every test runs inside
a transaction that is rolled back at the end, so tests stay isolated without
paying the migration cost per test.
"""
from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# SEED_USERS must be true before app.core.config is imported, since Settings is cached.
os.environ.setdefault("SEED_USERS", "true")
# Effectively disable the login rate-limit during pytest — every test logs in.
os.environ.setdefault("LOGIN_RATE_LIMIT", "100000/minute")

from app.core.config import settings  # noqa: E402

# Force every component (engine, alembic, etc.) to use the test DB.
settings.DATABASE_URL = settings.TEST_DATABASE_URL
settings.DATABASE_URL_SYNC = settings.TEST_DATABASE_URL_SYNC
os.environ["DATABASE_URL"] = settings.TEST_DATABASE_URL
os.environ["DATABASE_URL_SYNC"] = settings.TEST_DATABASE_URL_SYNC

BACKEND_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Wipe + alembic upgrade head (subprocess so the alembic env's asyncio.run is safe)."""
    engine = create_engine(settings.TEST_DATABASE_URL_SYNC, future=True)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    engine.dispose()

    env = {
        **os.environ,
        "DATABASE_URL": settings.TEST_DATABASE_URL,
        "DATABASE_URL_SYNC": settings.TEST_DATABASE_URL_SYNC,
        "SEED_USERS": "true",
    }
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(BACKEND_ROOT),
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"alembic upgrade head failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
        )
    yield


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """A fresh AsyncSession per test, wrapped in a rollback transaction."""
    engine = create_async_engine(settings.DATABASE_URL, future=True)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.connect() as connection:
        trans = await connection.begin()
        async with SessionLocal(bind=connection) as session:
            try:
                yield session
            finally:
                await trans.rollback()
    await engine.dispose()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """ASGI HTTP client. The app's `get_db` is overridden to use a connection
    that is rolled back at the end of the test (commits become savepoints)."""
    from app.core.database import get_db
    from app.main import app

    engine = create_async_engine(settings.DATABASE_URL, future=True)
    SessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        # Critical: route-level commits become savepoint releases inside the
        # outer transaction, which the fixture rolls back.
        join_transaction_mode="create_savepoint",
    )

    async with engine.connect() as connection:
        trans = await connection.begin()

        async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
            async with SessionLocal(bind=connection) as session:
                try:
                    yield session
                except Exception:
                    await session.rollback()
                    raise

        app.dependency_overrides[get_db] = _override_get_db
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                yield ac
        finally:
            app.dependency_overrides.pop(get_db, None)
            await trans.rollback()
    await engine.dispose()


async def login_token(client: AsyncClient, account_id: str, password: str) -> str:
    res = await client.post(
        "/api/v1/auth/login", json={"account_id": account_id, "password": password}
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
