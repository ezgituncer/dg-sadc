"""Lookup CRUD routers — projects, activity_types, task_types, and the 3 category tables.

Pattern per resource:
- GET / GET /{id} — open to any authenticated user (the entry form needs the dropdowns)
- POST / PATCH / DELETE / POST /{id}/activate — non-WORKER
- GET /{id}/usage — usage count, non-WORKER

Code is immutable (handled by the update schema).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_permission
from app.core.database import get_db
from app.core.permissions import LOOKUPS_MANAGE
from app.models import (
    ActivityType,
    NonProjectCategory,
    Project,
    ProjectCategory,
    SelfImpCategory,
    TaskType,
    User,
)
from app.schemas.lookup import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    LookupCreate,
    LookupOut,
    LookupUpdate,
    TaskTypeCreate,
    TaskTypeOut,
    TaskTypeUpdate,
    UsageCount,
)
from app.services import lookup_service

# --- Projects ----------------------------------------------------------------

projects_router = APIRouter(prefix="/projects", tags=["lookups: projects"])


@projects_router.get("", response_model=list[LookupOut])
async def list_projects(
    search: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Project]:
    return await lookup_service.list_items(
        db, Project, search=search, include_inactive=include_inactive
    )


@projects_router.get("/{item_id}", response_model=LookupOut)
async def get_project(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Project:
    return await lookup_service.get_item(db, Project, item_id)


@projects_router.get("/{item_id}/usage", response_model=UsageCount)
async def project_usage(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> UsageCount:
    n = await lookup_service.count_usage_for_project(db, item_id)
    return UsageCount(count=n)


@projects_router.post("", response_model=LookupOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: LookupCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> Project:
    obj = await lookup_service.create_item(db, Project, payload)
    await db.commit()
    return obj


@projects_router.patch("/{item_id}", response_model=LookupOut)
async def update_project(
    item_id: int,
    payload: LookupUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> Project:
    obj = await lookup_service.update_item(db, Project, item_id, payload)
    await db.commit()
    return obj


@projects_router.delete("/{item_id}", response_model=LookupOut)
async def soft_delete_project(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> Project:
    obj = await lookup_service.soft_delete(db, Project, item_id)
    await db.commit()
    return obj


@projects_router.post("/{item_id}/activate", response_model=LookupOut)
async def activate_project(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> Project:
    obj = await lookup_service.activate(db, Project, item_id)
    await db.commit()
    return obj


# --- Activity types ----------------------------------------------------------

activity_types_router = APIRouter(prefix="/activity-types", tags=["lookups: activity-types"])


@activity_types_router.get("", response_model=list[LookupOut])
async def list_activity_types(
    search: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ActivityType]:
    return await lookup_service.list_items(
        db, ActivityType, search=search, include_inactive=include_inactive
    )


@activity_types_router.get("/{item_id}", response_model=LookupOut)
async def get_activity_type(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ActivityType:
    return await lookup_service.get_item(db, ActivityType, item_id)


@activity_types_router.get("/{item_id}/usage", response_model=UsageCount)
async def activity_type_usage(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> UsageCount:
    n = await lookup_service.count_usage_for_activity_type(db, item_id)
    return UsageCount(count=n)


@activity_types_router.post("", response_model=LookupOut, status_code=status.HTTP_201_CREATED)
async def create_activity_type(
    payload: LookupCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> ActivityType:
    obj = await lookup_service.create_item(db, ActivityType, payload)
    await db.commit()
    return obj


@activity_types_router.patch("/{item_id}", response_model=LookupOut)
async def update_activity_type(
    item_id: int,
    payload: LookupUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> ActivityType:
    obj = await lookup_service.update_item(db, ActivityType, item_id, payload)
    await db.commit()
    return obj


@activity_types_router.delete("/{item_id}", response_model=LookupOut)
async def soft_delete_activity_type(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> ActivityType:
    obj = await lookup_service.soft_delete(db, ActivityType, item_id)
    await db.commit()
    return obj


@activity_types_router.post("/{item_id}/activate", response_model=LookupOut)
async def activate_activity_type(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> ActivityType:
    obj = await lookup_service.activate(db, ActivityType, item_id)
    await db.commit()
    return obj


# --- Task types --------------------------------------------------------------

task_types_router = APIRouter(prefix="/task-types", tags=["lookups: task-types"])


@task_types_router.get("", response_model=list[TaskTypeOut])
async def list_task_types(
    search: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[TaskType]:
    return await lookup_service.list_items(
        db, TaskType, search=search, include_inactive=include_inactive
    )


@task_types_router.get("/{item_id}/usage", response_model=UsageCount)
async def task_type_usage(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> UsageCount:
    n = await lookup_service.count_usage_for_task_type(db, item_id)
    return UsageCount(count=n)


@task_types_router.post("", response_model=TaskTypeOut, status_code=status.HTTP_201_CREATED)
async def create_task_type(
    payload: TaskTypeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> TaskType:
    obj = await lookup_service.create_item(db, TaskType, payload)
    await db.commit()
    return obj


@task_types_router.patch("/{item_id}", response_model=TaskTypeOut)
async def update_task_type(
    item_id: int,
    payload: TaskTypeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> TaskType:
    obj = await lookup_service.update_item(db, TaskType, item_id, payload)
    await db.commit()
    return obj


@task_types_router.delete("/{item_id}", response_model=TaskTypeOut)
async def soft_delete_task_type(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> TaskType:
    obj = await lookup_service.soft_delete(db, TaskType, item_id)
    await db.commit()
    return obj


@task_types_router.post("/{item_id}/activate", response_model=TaskTypeOut)
async def activate_task_type(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission(LOOKUPS_MANAGE)),
) -> TaskType:
    obj = await lookup_service.activate(db, TaskType, item_id)
    await db.commit()
    return obj


# --- Category tables ---------------------------------------------------------
# We expose the 3 category tables under separate URLs to mirror the mock UX.


def _make_category_router(prefix: str, model, activity_type_id: int, tag: str) -> APIRouter:
    rt = APIRouter(prefix=prefix, tags=[tag])

    @rt.get("", response_model=list[CategoryOut])
    async def _list(
        search: str | None = Query(default=None),
        include_inactive: bool = Query(default=False),
        db: AsyncSession = Depends(get_db),
        _user: User = Depends(get_current_user),
    ):
        return await lookup_service.list_items(
            db, model, search=search, include_inactive=include_inactive
        )

    @rt.get("/{item_id}/usage", response_model=UsageCount)
    async def _usage(
        item_id: int,
        db: AsyncSession = Depends(get_db),
        _user: User = Depends(require_permission(LOOKUPS_MANAGE)),
    ):
        n = await lookup_service.count_usage_for_category(db, activity_type_id, item_id)
        return UsageCount(count=n)

    @rt.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
    async def _create(
        payload: CategoryCreate,
        db: AsyncSession = Depends(get_db),
        _user: User = Depends(require_permission(LOOKUPS_MANAGE)),
    ):
        obj = await lookup_service.create_item(db, model, payload)
        await db.commit()
        return obj

    @rt.patch("/{item_id}", response_model=CategoryOut)
    async def _update(
        item_id: int,
        payload: CategoryUpdate,
        db: AsyncSession = Depends(get_db),
        _user: User = Depends(require_permission(LOOKUPS_MANAGE)),
    ):
        obj = await lookup_service.update_item(db, model, item_id, payload)
        await db.commit()
        return obj

    @rt.delete("/{item_id}", response_model=CategoryOut)
    async def _delete(
        item_id: int,
        db: AsyncSession = Depends(get_db),
        _user: User = Depends(require_permission(LOOKUPS_MANAGE)),
    ):
        obj = await lookup_service.soft_delete(db, model, item_id)
        await db.commit()
        return obj

    @rt.post("/{item_id}/activate", response_model=CategoryOut)
    async def _activate(
        item_id: int,
        db: AsyncSession = Depends(get_db),
        _user: User = Depends(require_permission(LOOKUPS_MANAGE)),
    ):
        obj = await lookup_service.activate(db, model, item_id)
        await db.commit()
        return obj

    return rt


project_categories_router = _make_category_router(
    "/project-categories", ProjectCategory, activity_type_id=1, tag="lookups: project-categories"
)
non_project_categories_router = _make_category_router(
    "/non-project-categories",
    NonProjectCategory,
    activity_type_id=2,
    tag="lookups: non-project-categories",
)
self_imp_categories_router = _make_category_router(
    "/self-imp-categories", SelfImpCategory, activity_type_id=3, tag="lookups: self-imp-categories"
)


# --- Aggregator --------------------------------------------------------------

all_lookup_routers = [
    projects_router,
    activity_types_router,
    task_types_router,
    project_categories_router,
    non_project_categories_router,
    self_imp_categories_router,
]
