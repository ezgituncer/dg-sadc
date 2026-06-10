from sqlalchemy import BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin
from app.models.permission import Permission, role_permissions


class Role(Base, CreatedAtMixin):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Superuser roles (ADMIN) bypass all permission checks. System roles are the
    # seeded six — protected from deletion so the app always has a usable set.
    is_superuser: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # Eager-loaded so get_current_user can compute the effective permission set
    # without a lazy load outside the async context.
    permissions: Mapped[list[Permission]] = relationship(
        Permission, secondary=role_permissions, lazy="selectin"
    )

    @property
    def permission_codes(self) -> set[str]:
        return {p.code for p in self.permissions}
