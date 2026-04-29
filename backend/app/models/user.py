from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    position: Mapped[str | None] = mapped_column(String(255), nullable=True)

    role_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    team_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    manager_account_id: Mapped[str | None] = mapped_column(
        String(20),
        ForeignKey("users.account_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    role = relationship("Role", lazy="joined")
    team = relationship("Team", lazy="joined")
    manager = relationship(
        "User",
        remote_side="User.account_id",
        primaryjoin="User.manager_account_id == User.account_id",
        foreign_keys=[manager_account_id],
        backref="reports",
    )

    __table_args__ = (
        Index("ix_users_role_id_is_active", "role_id", "is_active"),
    )
