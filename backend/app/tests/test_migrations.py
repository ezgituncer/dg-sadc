"""Sanity checks: migrations applied + seed data present in expected shape."""
from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ActivityType,
    NonProjectCategory,
    ProjectCategory,
    Role,
    SelfImpCategory,
    Team,
    User,
)


@pytest.mark.asyncio
async def test_roles_seeded(db_session: AsyncSession) -> None:
    rows = (await db_session.execute(select(Role).order_by(Role.id))).scalars().all()
    codes = [r.code for r in rows]
    assert codes == ["ADMIN", "HR", "MANAGER", "TECH_LEAD", "QA_SPECIALIST", "WORKER"]


@pytest.mark.asyncio
async def test_teams_seeded(db_session: AsyncSession) -> None:
    teams = (await db_session.execute(select(Team).order_by(Team.id))).scalars().all()
    assert [t.name for t in teams] == [
        "Engineering",
        "Product",
        "Design",
        "QA",
        "DevOps",
        "Marketing",
    ]


@pytest.mark.asyncio
async def test_activity_types_have_stable_ids(db_session: AsyncSession) -> None:
    types = (
        (await db_session.execute(select(ActivityType).order_by(ActivityType.id)))
        .scalars()
        .all()
    )
    assert [(t.id, t.code) for t in types] == [
        (1, "PROJECT"),
        (2, "NON_PROJECT"),
        (3, "SELF_IMP"),
    ]


@pytest.mark.asyncio
async def test_three_category_tables_seeded(db_session: AsyncSession) -> None:
    pc = (await db_session.execute(select(ProjectCategory))).scalars().all()
    npc = (await db_session.execute(select(NonProjectCategory))).scalars().all()
    sic = (await db_session.execute(select(SelfImpCategory))).scalars().all()
    assert (len(pc), len(npc), len(sic)) == (6, 5, 5)


@pytest.mark.asyncio
async def test_users_seeded_with_hashed_passwords(db_session: AsyncSession) -> None:
    admin = (
        await db_session.execute(select(User).where(User.account_id == "ADM001"))
    ).scalar_one()
    assert admin.email == "admin@company.com"
    assert admin.password_hash.startswith("$2b$")  # bcrypt
    assert admin.password_hash != "admin123"


@pytest.mark.asyncio
async def test_user_hierarchy_intact(db_session: AsyncSession) -> None:
    worker = (
        await db_session.execute(select(User).where(User.account_id == "EMP001"))
    ).scalar_one()
    assert worker.manager_account_id == "MGR001"
    mgr = (
        await db_session.execute(select(User).where(User.account_id == "MGR001"))
    ).scalar_one()
    assert mgr.manager_account_id == "HEM001"
