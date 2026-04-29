"""seed lookups

Inserts the basic lookup data required in EVERY environment (including prod):
roles, teams, activity_types (with stable IDs 1, 2, 3), projects, task_types,
and the three category tables. Values are taken from the mock prototype.

Revision ID: 80eb395bb86c
Revises: 7b82b69f7bac
Create Date: 2026-04-29 01:37:21.514109
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "80eb395bb86c"
down_revision: Union[str, None] = "7b82b69f7bac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# --- Seed data ---------------------------------------------------------------

ROLES = [
    {"id": 1, "code": "ADMIN", "name": "Admin", "description": "Tam yetki"},
    {"id": 2, "code": "HR", "name": "HR", "description": "İnsan kaynakları"},
    {"id": 3, "code": "MANAGER", "name": "Manager", "description": "Yönetici"},
    {"id": 4, "code": "TECH_LEAD", "name": "Technical Lead", "description": "Teknik lider"},
    {"id": 5, "code": "QA_SPECIALIST", "name": "QA Specialist", "description": "Kalite uzmanı"},
    {"id": 6, "code": "WORKER", "name": "Worker", "description": "Çalışan"},
]

TEAMS = [
    {"id": 1, "name": "Engineering", "description": "Yazılım geliştirme"},
    {"id": 2, "name": "Product", "description": "Ürün yönetimi"},
    {"id": 3, "name": "Design", "description": "UI/UX tasarım"},
    {"id": 4, "name": "QA", "description": "Test ve kalite"},
    {"id": 5, "name": "DevOps", "description": "Altyapı ve deployment"},
    {"id": 6, "name": "Marketing", "description": "Pazarlama"},
]

# IDs 1, 2, 3 are stable — code that maps activity → category table relies on them.
ACTIVITY_TYPES = [
    {"id": 1, "code": "PROJECT", "name": "Project Activity", "description": "Bir projeye yönelik çalışma"},
    {"id": 2, "code": "NON_PROJECT", "name": "Non-Project Activity", "description": "Proje dışı şirket içi faaliyetler"},
    {"id": 3, "code": "SELF_IMP", "name": "Self Capability Improvement", "description": "Eğitim, kurs, kişisel gelişim"},
]

PROJECTS = [
    {"id": 1, "code": "ATLAS", "name": "Atlas Platform", "description": "Ana ürün platformu"},
    {"id": 2, "code": "MOB-3", "name": "Mobile App v3", "description": "iOS ve Android uygulaması"},
    {"id": 3, "code": "DATA", "name": "Data Pipeline", "description": "Veri işleme altyapısı"},
    {"id": 4, "code": "INT", "name": "Internal Tools", "description": "Şirket içi araçlar"},
    {"id": 5, "code": "API-V2", "name": "API v2 Migration", "description": "Yeni API geçişi"},
]

TASK_TYPES = [
    {"id": 1, "code": "DEV", "name": "Development"},
    {"id": 2, "code": "MEETING", "name": "Meeting"},
    {"id": 3, "code": "REVIEW", "name": "Review"},
    {"id": 4, "code": "RESEARCH", "name": "Research"},
    {"id": 5, "code": "DOC", "name": "Documentation"},
]

PROJECT_CATEGORIES = [
    {"id": 1, "code": "FRONTEND", "name": "Frontend", "color": "#2DD4BF"},
    {"id": 2, "code": "BACKEND", "name": "Backend", "color": "#3B82F6"},
    {"id": 3, "code": "DATABASE", "name": "Database", "color": "#A78BFA"},
    {"id": 4, "code": "DEVOPS", "name": "DevOps", "color": "#F59E0B"},
    {"id": 5, "code": "TESTING", "name": "Testing", "color": "#EC4899"},
    {"id": 6, "code": "DESIGN", "name": "Design", "color": "#10B981"},
]

NON_PROJECT_CATEGORIES = [
    {"id": 1, "code": "MEETING", "name": "Toplantı", "color": "#3B82F6"},
    {"id": 2, "code": "ADMIN", "name": "İdari işler", "color": "#A78BFA"},
    {"id": 3, "code": "HR_BRIEF", "name": "HR Briefing", "color": "#F59E0B"},
    {"id": 4, "code": "IT_SUPPORT", "name": "IT Support", "color": "#EC4899"},
    {"id": 5, "code": "INTERVIEW", "name": "Mülakat", "color": "#10B981"},
]

SELF_IMP_CATEGORIES = [
    {"id": 1, "code": "COURSE", "name": "Online Kurs", "color": "#2DD4BF"},
    {"id": 2, "code": "CERT", "name": "Sertifikasyon", "color": "#3B82F6"},
    {"id": 3, "code": "CONFERENCE", "name": "Konferans / Webinar", "color": "#A78BFA"},
    {"id": 4, "code": "BOOK", "name": "Kitap / Makale", "color": "#F59E0B"},
    {"id": 5, "code": "PRACTICE", "name": "Algoritma / Pratik", "color": "#EC4899"},
]


# --- Helpers -----------------------------------------------------------------

def _resync_serial(table: str) -> None:
    """After explicit-id INSERTs, advance the BIGSERIAL sequence past max(id)."""
    op.execute(
        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
        f"COALESCE((SELECT MAX(id) FROM {table}), 1))"
    )


def _bulk_insert(table_name: str, columns: list, rows: list[dict]) -> None:
    table = sa.table(table_name, *columns)
    op.bulk_insert(table, rows)


# --- Migration ---------------------------------------------------------------

def upgrade() -> None:
    _bulk_insert(
        "roles",
        [
            sa.column("id", sa.BigInteger),
            sa.column("code", sa.String),
            sa.column("name", sa.String),
            sa.column("description", sa.String),
        ],
        ROLES,
    )
    _resync_serial("roles")

    _bulk_insert(
        "teams",
        [
            sa.column("id", sa.BigInteger),
            sa.column("name", sa.String),
            sa.column("description", sa.String),
        ],
        TEAMS,
    )
    _resync_serial("teams")

    _bulk_insert(
        "activity_types",
        [
            sa.column("id", sa.BigInteger),
            sa.column("code", sa.String),
            sa.column("name", sa.String),
            sa.column("description", sa.String),
        ],
        ACTIVITY_TYPES,
    )
    _resync_serial("activity_types")

    _bulk_insert(
        "projects",
        [
            sa.column("id", sa.BigInteger),
            sa.column("code", sa.String),
            sa.column("name", sa.String),
            sa.column("description", sa.String),
        ],
        PROJECTS,
    )
    _resync_serial("projects")

    _bulk_insert(
        "task_types",
        [
            sa.column("id", sa.BigInteger),
            sa.column("code", sa.String),
            sa.column("name", sa.String),
        ],
        TASK_TYPES,
    )
    _resync_serial("task_types")

    for table_name, rows in (
        ("project_categories", PROJECT_CATEGORIES),
        ("non_project_categories", NON_PROJECT_CATEGORIES),
        ("self_imp_categories", SELF_IMP_CATEGORIES),
    ):
        _bulk_insert(
            table_name,
            [
                sa.column("id", sa.BigInteger),
                sa.column("code", sa.String),
                sa.column("name", sa.String),
                sa.column("color", sa.String),
            ],
            rows,
        )
        _resync_serial(table_name)


def downgrade() -> None:
    op.execute("TRUNCATE self_imp_categories RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE non_project_categories RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE project_categories RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE task_types RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE projects RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE activity_types RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE teams RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE roles RESTART IDENTITY CASCADE")
