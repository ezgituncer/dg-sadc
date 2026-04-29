"""Lightweight request/response logging — JSON-friendly format, no body capture."""
from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

logger = logging.getLogger("workload.access")

# Endpoints we don't want to spam logs with on every poll.
QUIET_PATHS = {"/health", "/api/v1/health", "/api/v1/health/db"}


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )


def register_request_logger(app: FastAPI) -> None:
    @app.middleware("http")
    async def _log_request(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path in QUIET_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        request_id = uuid.uuid4().hex[:12]
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            logger.info(
                "%s %s %s %sms id=%s",
                request.method,
                request.url.path,
                status_code,
                duration_ms,
                request_id,
            )
