from datetime import date
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class WorkloadEntry(Base, TimestampMixin):
    __tablename__ = "workload_entries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(
        String(20),
        ForeignKey("users.account_id", ondelete="RESTRICT"),
        nullable=False,
    )
    work_date: Mapped[date] = mapped_column(Date, nullable=False)

    activity_type_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("activity_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # category_id refers to one of three category tables, depending on
    # activity_type_id. The DB-level FK is intentionally not enforced; the
    # service layer validates against the correct table.
    category_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    project_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=True,
    )
    task_type_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("task_types.id", ondelete="RESTRICT"),
        nullable=True,
    )

    task_description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    complexity: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hours_spent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    user = relationship("User", lazy="joined", foreign_keys=[account_id])
    activity_type = relationship("ActivityType", lazy="joined")
    project = relationship("Project", lazy="joined")
    task_type = relationship("TaskType", lazy="joined")

    __table_args__ = (
        CheckConstraint(
            "status IN ('ongoing', 'completed', 'blocked')",
            name="ck_workload_entries_status",
        ),
        CheckConstraint(
            "complexity IN ('low', 'medium', 'high')",
            name="ck_workload_entries_complexity",
        ),
        CheckConstraint("hours_spent > 0", name="ck_workload_entries_hours_positive"),
        CheckConstraint(
            "(activity_type_id = 1 AND project_id IS NOT NULL) OR "
            "(activity_type_id IN (2, 3) AND project_id IS NULL)",
            name="ck_workload_entries_project_consistency",
        ),
        Index("ix_workload_entries_account_id_work_date", "account_id", "work_date"),
        Index("ix_workload_entries_work_date", "work_date"),
        Index("ix_workload_entries_project_id", "project_id"),
        Index(
            "ix_workload_entries_activity_type_id_category_id",
            "activity_type_id",
            "category_id",
        ),
    )
