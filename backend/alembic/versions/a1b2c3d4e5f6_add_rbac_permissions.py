"""Add RBAC permissions: permissions table, role_permissions, role flags + seed.

Introduces permission-based access control. Each feature exposes a view + manage
permission; roles link to a subset. ADMIN is flagged superuser (all permissions);
the six seeded roles are flagged system (cannot be deleted). Default role→permission
mappings reproduce the pre-RBAC behavior.

Revision ID: a1b2c3d4e5f6
Revises: 3c8ebb004fa0
Create Date: 2026-06-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3c8ebb004fa0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# --- Seed data (must match app/core/permissions.py) --------------------------
PERMISSIONS = [
    {"id": 1, "code": "workload.view", "name": "Workload – View", "feature": "workload", "kind": "view"},
    {"id": 2, "code": "workload.manage", "name": "Workload – Manage", "feature": "workload", "kind": "manage"},
    {"id": 3, "code": "yearly_report.view", "name": "Yearly Report – View", "feature": "yearly_report", "kind": "view"},
    {"id": 4, "code": "yearly_report.manage", "name": "Yearly Report – Manage", "feature": "yearly_report", "kind": "manage"},
    {"id": 5, "code": "users.view", "name": "Users – View", "feature": "users", "kind": "view"},
    {"id": 6, "code": "users.manage", "name": "Users – Manage", "feature": "users", "kind": "manage"},
    {"id": 7, "code": "lookups.view", "name": "Lookups – View", "feature": "lookups", "kind": "view"},
    {"id": 8, "code": "lookups.manage", "name": "Lookups – Manage", "feature": "lookups", "kind": "manage"},
    {"id": 9, "code": "roles.view", "name": "Roles – View", "feature": "roles", "kind": "view"},
    {"id": 10, "code": "roles.manage", "name": "Roles – Manage", "feature": "roles", "kind": "manage"},
]

# role_id → permission_ids. ADMIN (1) is superuser → no explicit rows needed.
ROLE_PERMS = {
    2: [1, 2, 3, 5, 6, 7, 8],          # HR: working days read-only (no 4)
    3: [1, 2, 3, 4, 5, 6, 7, 8],       # MANAGER
    4: [1, 2, 3, 4, 5, 6, 7, 8],       # TECH_LEAD
    5: [1, 2, 3, 4, 5, 6, 7, 8],       # QA_SPECIALIST
    6: [1, 2],                         # WORKER: own workload only
}


def upgrade() -> None:
    # --- schema ---
    op.add_column(
        "roles",
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "roles",
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.create_table(
        "permissions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("feature", sa.String(length=50), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_permissions_code"), "permissions", ["code"], unique=True)
    op.create_index(op.f("ix_permissions_feature"), "permissions", ["feature"], unique=False)

    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.Column("permission_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("role_id", "permission_id"),
    )

    # --- seed ---
    permissions_table = sa.table(
        "permissions",
        sa.column("id", sa.BigInteger),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("feature", sa.String),
        sa.column("kind", sa.String),
    )
    op.bulk_insert(permissions_table, PERMISSIONS)

    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("role_id", sa.BigInteger),
        sa.column("permission_id", sa.BigInteger),
    )
    rows = [
        {"role_id": rid, "permission_id": pid}
        for rid, pids in ROLE_PERMS.items()
        for pid in pids
    ]
    op.bulk_insert(role_permissions_table, rows)

    # Flags: ADMIN superuser; all six seeded roles are system.
    op.execute("UPDATE roles SET is_superuser = true WHERE code = 'ADMIN'")
    op.execute(
        "UPDATE roles SET is_system = true "
        "WHERE code IN ('ADMIN', 'HR', 'MANAGER', 'TECH_LEAD', 'QA_SPECIALIST', 'WORKER')"
    )

    # Keep the permissions id sequence ahead of the seeded ids.
    op.execute("SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions))")


def downgrade() -> None:
    op.drop_table("role_permissions")
    op.drop_index(op.f("ix_permissions_feature"), table_name="permissions")
    op.drop_index(op.f("ix_permissions_code"), table_name="permissions")
    op.drop_table("permissions")
    op.drop_column("roles", "is_system")
    op.drop_column("roles", "is_superuser")
