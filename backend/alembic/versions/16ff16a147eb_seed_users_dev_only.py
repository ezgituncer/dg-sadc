"""seed users (dev only)

Inserts the test user accounts from the mock prototype, with bcrypt-hashed
passwords. Guarded by the SEED_USERS env var (read via app.core.config) so
production never receives test accounts.

Revision ID: 16ff16a147eb
Revises: 80eb395bb86c
Create Date: 2026-04-29 01:38:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext

from app.core.config import settings


revision: str = "16ff16a147eb"
down_revision: Union[str, None] = "80eb395bb86c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Plain passwords are listed only for dev seeding. The DB stores bcrypt hashes.
USERS = [
    # Admin / Director
    ("ADM001", "admin@company.com", "Ayşe Yılmaz", "admin123", "System Administrator", 1, 5, None),
    # HR
    ("HR001", "hr.manager@company.com", "Mehmet Kaya", "hr123", "HR Manager", 2, 6, "ADM001"),
    ("HR002", "hr.specialist@company.com", "Zeynep Demir", "hr123", "HR Specialist", 2, 6, "HR001"),
    # HEM
    ("HEM001", "head.engineering@company.com", "Mert Tunç", "hem123", "Head of Engineering", 3, 1, "ADM001"),
    # Managers
    ("MGR001", "eng.manager@company.com", "Ali Çelik", "mgr123", "Engineering Manager", 3, 1, "HEM001"),
    ("MGR002", "product.manager@company.com", "Selin Aydın", "mgr123", "Product Manager", 3, 2, "ADM001"),
    # Tech Leads
    ("TL001", "frontend.lead@company.com", "Cem Öztürk", "tl123", "Frontend Tech Lead", 4, 1, "MGR001"),
    ("TL002", "backend.lead@company.com", "Deniz Korkmaz", "tl123", "Backend Tech Lead", 4, 1, "MGR001"),
    ("TL003", "devops.lead@company.com", "Emre Polat", "tl123", "DevOps Tech Lead", 4, 5, "MGR001"),
    # QA Specialists
    ("QA001", "qa.lead@company.com", "Fatma Aslan", "qa123", "QA Lead", 5, 4, "ADM001"),
    ("QA002", "qa.senior@company.com", "Gökhan Erdem", "qa123", "Senior QA Engineer", 5, 4, "QA001"),
    # Workers — Engineering
    ("EMP001", "developer1@company.com", "Hakan Yıldız", "pass123", "Senior Frontend Developer", 6, 1, "MGR001"),
    ("EMP002", "developer2@company.com", "İrem Acar", "pass123", "Junior Frontend Developer", 6, 1, "MGR001"),
    ("EMP003", "developer3@company.com", "Kerem Bulut", "pass123", "Senior Backend Developer", 6, 1, "MGR001"),
    ("EMP004", "developer4@company.com", "Lale Kurt", "pass123", "Backend Developer", 6, 1, "MGR001"),
    # Workers — Product
    ("EMP005", "product1@company.com", "Murat Tan", "pass123", "Product Owner", 6, 2, "MGR002"),
    # Workers — QA
    ("EMP008", "qa1@company.com", "Pınar Akın", "pass123", "QA Engineer", 6, 4, "QA001"),
    ("EMP009", "qa2@company.com", "Rıza Ergin", "pass123", "Junior QA Engineer", 6, 4, "QA001"),
    # Workers — DevOps
    ("EMP010", "devops1@company.com", "Sema Tekin", "pass123", "DevOps Engineer", 6, 5, "MGR001"),
]


def upgrade() -> None:
    if not settings.SEED_USERS:
        return

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    rows = [
        {
            "account_id": account_id,
            "email": email,
            "name": name,
            "password_hash": pwd_context.hash(password),
            "is_active": True,
            "position": position,
            "role_id": role_id,
            "team_id": team_id,
            "manager_account_id": manager_account_id,
        }
        for (account_id, email, name, password, position, role_id, team_id, manager_account_id) in USERS
    ]

    users_table = sa.table(
        "users",
        sa.column("account_id", sa.String),
        sa.column("email", sa.String),
        sa.column("name", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("position", sa.String),
        sa.column("role_id", sa.BigInteger),
        sa.column("team_id", sa.BigInteger),
        sa.column("manager_account_id", sa.String),
    )

    # Insert managers (no manager_account_id) before their reports because of
    # the self-FK.
    managers_first = sorted(
        rows, key=lambda r: (r["manager_account_id"] is not None, r["manager_account_id"] or "")
    )
    op.bulk_insert(users_table, managers_first)


def downgrade() -> None:
    if not settings.SEED_USERS:
        return
    seeded_ids = tuple(account_id for (account_id, *_rest) in USERS)
    op.execute(
        sa.text("DELETE FROM users WHERE account_id IN :ids").bindparams(
            sa.bindparam("ids", value=list(seeded_ids), expanding=True)
        )
    )
