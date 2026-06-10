"""Keep the permissions table in sync with the code catalog at startup.

The migration seeds the initial catalog and default role mappings. As new features
add permission codes to app.core.permissions, this idempotent sync inserts the
missing rows on boot so they become assignable from the UI — no migration needed.
It never edits role mappings (admins own those) beyond ensuring ADMIN stays a
superuser.
"""
from __future__ import annotations

import logging

from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.core.permissions import CATALOG, SUPERUSER_ROLE_CODE
from app.models import Permission, Role

logger = logging.getLogger(__name__)


async def sync_permissions() -> None:
    try:
        async with AsyncSessionLocal() as db:
            existing = set(
                (await db.execute(select(Permission.code))).scalars().all()
            )
            new_rows = [
                Permission(
                    code=item["code"],
                    name=item["name"],
                    feature=item["feature"],
                    kind=item["kind"],
                )
                for item in CATALOG
                if item["code"] not in existing
            ]
            if new_rows:
                db.add_all(new_rows)
                logger.info("RBAC sync: inserted %d new permission(s)", len(new_rows))

            # Safety net: the ADMIN role must always be a superuser.
            await db.execute(
                update(Role).where(Role.code == SUPERUSER_ROLE_CODE).values(is_superuser=True)
            )
            await db.commit()
    except Exception:  # pragma: no cover - never block startup on sync
        logger.exception("RBAC permission sync failed (continuing startup)")
