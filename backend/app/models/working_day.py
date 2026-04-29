from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ExpectedWorkingDay(Base):
    __tablename__ = "expected_working_days"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    working_days: Mapped[int] = mapped_column(Integer, nullable=False)

    updated_by_account_id: Mapped[str | None] = mapped_column(
        String(20),
        ForeignKey("users.account_id"),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("year", "month", name="uq_expected_working_days_year_month"),
        CheckConstraint("month BETWEEN 1 AND 12", name="ck_expected_working_days_month"),
        CheckConstraint(
            "working_days BETWEEN 0 AND 31",
            name="ck_expected_working_days_working_days",
        ),
    )
