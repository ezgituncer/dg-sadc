"""Global exception handlers — uniform JSON error envelope."""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _json_error(status_code: int, detail: str | list | dict, **extra) -> JSONResponse:
    body = {"detail": detail}
    body.update(extra)
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def _http_exc(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # FastAPI's HTTPException is a subclass; both flow through here.
        if exc.status_code >= 500:
            logger.exception("http error %s: %s", exc.status_code, exc.detail)
        return _json_error(exc.status_code, exc.detail or "Error")

    @app.exception_handler(RequestValidationError)
    async def _validation_exc(_request: Request, exc: RequestValidationError) -> JSONResponse:
        # Trim Pydantic's verbose payload to what the UI actually needs.
        errors = [
            {
                "loc": list(err.get("loc", [])),
                "msg": err.get("msg", "Invalid value"),
                "type": err.get("type", "value_error"),
            }
            for err in exc.errors()
        ]
        return _json_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Validation failed",
            errors=errors,
        )

    @app.exception_handler(IntegrityError)
    async def _integrity_exc(_request: Request, exc: IntegrityError) -> JSONResponse:
        logger.warning("integrity error: %s", exc)
        return _json_error(
            status.HTTP_400_BAD_REQUEST,
            detail="Constraint violation (duplicate key, FK, or check)",
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        # Re-raise HTTPException so its handler runs.
        if isinstance(exc, HTTPException):
            return await _http_exc(request, exc)  # type: ignore[arg-type]
        return _json_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
