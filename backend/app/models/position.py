from sqlalchemy import BigInteger, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Position(Base, TimestampMixin):
    """Company-internal job titles. Drives the org hierarchy: a user with
    position P must report to a user whose position is P.parent_position.

    Independent from `Role` (auth) — a single Position can map to any Role.
    """

    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    parent_position_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("positions.id", ondelete="RESTRICT"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    parent = relationship(
        "Position",
        remote_side="Position.id",
        foreign_keys=[parent_position_id],
        backref="children",
    )
