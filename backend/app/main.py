from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.limiter import limiter
from app.core.logging import configure_logging, register_request_logger
from app.core.rbac_sync import sync_permissions

configure_logging(settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Sync the permission catalog into the DB so newly added codes are assignable.
    await sync_permissions()
    yield


app = FastAPI(
    title="Workload Tracking API",
    version="0.1.0",
    description="Internal workload tracking — see /docs for the OpenAPI spec.",
    lifespan=lifespan,
)

# Rate limiter (must be wired before middlewares that depend on `request.state.limiter`).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_request_logger(app)
register_exception_handlers(app)

app.include_router(api_router)


@app.get("/health")
async def root_health() -> dict[str, str]:
    return {"status": "ok"}
