from fastapi import APIRouter

from app.api.v1 import (
    auth,
    health,
    lookups,
    positions,
    reports,
    roles,
    teams,
    users,
    workload,
    working_days,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(workload.router)
api_router.include_router(reports.router)
api_router.include_router(working_days.router)
api_router.include_router(teams.router)
api_router.include_router(roles.router)
api_router.include_router(positions.router)

for r in lookups.all_lookup_routers:
    api_router.include_router(r)
