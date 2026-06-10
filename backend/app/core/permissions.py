"""Permission catalog — the single source of truth for RBAC.

Features live in code, so the set of permissions does too. Each feature exposes
two permissions:

* ``<feature>.view``   — read-only access (listing / viewing the feature page)
* ``<feature>.manage`` — create + edit + delete within that feature

The catalog is synced into the ``permissions`` table (migration seeds it; startup
inserts any new codes). Roles are linked to permissions via ``role_permissions``
and are fully editable from the UI. The ADMIN role is a superuser and bypasses
every check.
"""
from __future__ import annotations

VIEW = "view"
MANAGE = "manage"

# (key, human label). Order is the order shown in the role matrix UI.
FEATURES: list[tuple[str, str]] = [
    ("workload", "Workload"),
    ("yearly_report", "Yearly Report"),
    ("users", "Users"),
    ("lookups", "Lookups"),
    ("roles", "Roles"),
]

FEATURE_LABELS: dict[str, str] = dict(FEATURES)


def perm_code(feature: str, kind: str) -> str:
    return f"{feature}.{kind}"


def _label(feature: str, kind: str) -> str:
    return f"{FEATURE_LABELS[feature]} – {'View' if kind == VIEW else 'Manage'}"


# Full catalog as dicts, ready to seed / sync. Stable order.
CATALOG: list[dict[str, str]] = [
    {
        "code": perm_code(feature, kind),
        "name": _label(feature, kind),
        "feature": feature,
        "kind": kind,
    }
    for feature, _label_name in FEATURES
    for kind in (VIEW, MANAGE)
]

ALL_CODES: list[str] = [p["code"] for p in CATALOG]

# --- Convenience constants used by the routers --------------------------------
WORKLOAD_VIEW = "workload.view"
WORKLOAD_MANAGE = "workload.manage"
YEARLY_REPORT_VIEW = "yearly_report.view"
YEARLY_REPORT_MANAGE = "yearly_report.manage"
USERS_VIEW = "users.view"
USERS_MANAGE = "users.manage"
LOOKUPS_VIEW = "lookups.view"
LOOKUPS_MANAGE = "lookups.manage"
ROLES_VIEW = "roles.view"
ROLES_MANAGE = "roles.manage"

# --- Default seed mappings (preserve the pre-RBAC behavior) -------------------
# ADMIN is a superuser (all permissions) and is handled separately. These are the
# first-time defaults for the other seeded roles; admins edit them from the UI.
SUPERUSER_ROLE_CODE = "ADMIN"
SYSTEM_ROLE_CODES = ["ADMIN", "HR", "MANAGER", "TECH_LEAD", "QA_SPECIALIST", "WORKER"]

_MANAGER_LIKE = [
    WORKLOAD_VIEW,
    WORKLOAD_MANAGE,
    YEARLY_REPORT_VIEW,
    YEARLY_REPORT_MANAGE,
    USERS_VIEW,
    USERS_MANAGE,
    LOOKUPS_VIEW,
    LOOKUPS_MANAGE,
]

DEFAULT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    # HR: user + lookup management, sees reports, but working days are read-only
    # (no yearly_report.manage).
    "HR": [
        WORKLOAD_VIEW,
        WORKLOAD_MANAGE,
        YEARLY_REPORT_VIEW,
        USERS_VIEW,
        USERS_MANAGE,
        LOOKUPS_VIEW,
        LOOKUPS_MANAGE,
    ],
    "MANAGER": list(_MANAGER_LIKE),
    "TECH_LEAD": list(_MANAGER_LIKE),
    "QA_SPECIALIST": list(_MANAGER_LIKE),
    # Worker: only their own workload; cannot see yearly report, users or lookups.
    "WORKER": [WORKLOAD_VIEW, WORKLOAD_MANAGE],
}
