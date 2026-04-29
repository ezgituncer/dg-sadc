"""Three independent category tables — one per activity type.

Same code/name can exist across the three tables; the unique key is per-table.
The 3-table design matches CLAUDE.md and the mockup.
"""
from sqlalchemy import BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class _CategoryBase(TimestampMixin):
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")


class ProjectCategory(Base, _CategoryBase):
    __tablename__ = "project_categories"


class NonProjectCategory(Base, _CategoryBase):
    __tablename__ = "non_project_categories"


class SelfImpCategory(Base, _CategoryBase):
    __tablename__ = "self_imp_categories"
