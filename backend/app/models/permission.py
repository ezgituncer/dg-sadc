from sqlalchemy import BigInteger, Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import CreatedAtMixin

# Many-to-many between roles and permissions. A role's effective permissions are
# the union of its linked rows (superuser roles bypass the check entirely).
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column(
        "role_id",
        BigInteger,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        BigInteger,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Permission(Base, CreatedAtMixin):
    """A single capability, e.g. ``workload.view`` / ``users.manage``.

    The catalog is defined in code (app.core.permissions) and synced into this
    table; rows are never created by end users. ``feature`` + ``kind`` are stored
    so the UI can render the role matrix grouped by feature with view/manage
    columns.
    """

    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    feature: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # "view" | "manage"
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
