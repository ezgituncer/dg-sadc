"""add positions and users.position_id

Creates the `positions` lookup, seeds it from the canonical job titles that
already exist in `users.position`, backfills `users.position_id`, then drops
the legacy text column. Roles remain unchanged — they are auth-only now;
positions drive the company hierarchy.

Revision ID: 3c8ebb004fa0
Revises: 585c7e6434b5
Create Date: 2026-05-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3c8ebb004fa0"
down_revision: Union[str, None] = "585c7e6434b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (name, parent_name, description) — parent_name=None means root.
# Matches the seeded `users.position` strings 1:1 so the backfill is exact.
POSITION_TREE = [
    # Root
    ("System Administrator", None, "Director — top of org"),

    # Level 1: directly under Director
    ("Head of Engineering", "System Administrator", "HEM"),
    ("Product Manager", "System Administrator", None),
    ("HR Manager", "System Administrator", None),
    ("QA Lead", "System Administrator", None),

    # Level 2
    ("HR Specialist", "HR Manager", None),
    ("Engineering Manager", "Head of Engineering", "EM"),
    ("Senior QA Engineer", "QA Lead", None),
    ("QA Engineer", "QA Lead", None),
    ("Junior QA Engineer", "QA Lead", None),

    # Level 3: under EM
    ("Frontend Tech Lead", "Engineering Manager", None),
    ("Backend Tech Lead", "Engineering Manager", None),
    ("DevOps Tech Lead", "Engineering Manager", None),
    ("Senior Frontend Developer", "Engineering Manager", None),
    ("Junior Frontend Developer", "Engineering Manager", None),
    ("Senior Backend Developer", "Engineering Manager", None),
    ("Backend Developer", "Engineering Manager", None),
    ("DevOps Engineer", "Engineering Manager", None),

    # Under Product Manager
    ("Product Owner", "Product Manager", None),
]


def upgrade() -> None:
    # 1. Create the positions table
    op.create_table(
        "positions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column(
            "parent_position_id",
            sa.BigInteger(),
            sa.ForeignKey("positions.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # 2. Seed positions in two passes so parents exist before children.
    conn = op.get_bind()
    name_to_id: dict[str, int] = {}

    # Pass 1: insert all without parent
    for name, _, description in POSITION_TREE:
        result = conn.execute(
            sa.text(
                "INSERT INTO positions (name, description, is_active) "
                "VALUES (:name, :description, true) RETURNING id"
            ),
            {"name": name, "description": description},
        )
        new_id = result.scalar_one()
        name_to_id[name] = new_id

    # Pass 2: set parent_position_id where applicable
    for name, parent_name, _ in POSITION_TREE:
        if parent_name is None:
            continue
        parent_id = name_to_id[parent_name]
        conn.execute(
            sa.text(
                "UPDATE positions SET parent_position_id = :pid WHERE id = :id"
            ),
            {"pid": parent_id, "id": name_to_id[name]},
        )

    # 3. Add users.position_id (nullable initially), then backfill
    op.add_column(
        "users",
        sa.Column(
            "position_id",
            sa.BigInteger(),
            sa.ForeignKey("positions.id", ondelete="RESTRICT"),
            nullable=True,
        ),
    )

    # Backfill: match users.position (TEXT) to positions.name exactly. Any
    # mismatch is left NULL — we'll catch it in the next step.
    conn.execute(
        sa.text(
            "UPDATE users u "
            "SET position_id = p.id "
            "FROM positions p "
            "WHERE u.position = p.name"
        )
    )

    # 4. If any users have a non-null position string that didn't match a
    #    canonical position, fail loudly — we don't want silent data loss.
    unmapped = conn.execute(
        sa.text(
            "SELECT account_id, position FROM users "
            "WHERE position IS NOT NULL AND position_id IS NULL"
        )
    ).all()
    if unmapped:
        names = ", ".join(f"{row[0]}({row[1]!r})" for row in unmapped)
        raise RuntimeError(
            f"Migration cannot continue — these users have a `position` string "
            f"that doesn't match any seeded position. Add the missing positions "
            f"to POSITION_TREE or update the users first: {names}"
        )

    # 5. Drop the legacy text column
    op.drop_column("users", "position")

    op.create_index("ix_users_position_id", "users", ["position_id"])


def downgrade() -> None:
    op.drop_index("ix_users_position_id", table_name="users")

    # Re-add the text column and backfill it from positions.name before dropping the FK.
    op.add_column(
        "users",
        sa.Column("position", sa.String(length=255), nullable=True),
    )
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE users u "
            "SET position = p.name "
            "FROM positions p "
            "WHERE u.position_id = p.id"
        )
    )
    op.drop_column("users", "position_id")
    op.drop_table("positions")
