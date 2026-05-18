"""make task_type_id nullable

Revision ID: 585c7e6434b5
Revises: 16ff16a147eb
Create Date: 2026-05-18 08:56:34.305645

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '585c7e6434b5'
down_revision: Union[str, None] = '16ff16a147eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "workload_entries",
        "task_type_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "workload_entries",
        "task_type_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )
