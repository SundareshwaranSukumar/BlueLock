"""HTTP request parsing helpers for v1 routes."""

from __future__ import annotations

from typing import Any, TypeVar

from fastapi import HTTPException, Request
from pydantic import BaseModel, ValidationError

ModelT = TypeVar("ModelT", bound=BaseModel)


async def read_json_object(request: Request) -> dict[str, Any]:
    """Parse request body as a JSON object."""
    try:
        body = await request.json()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid JSON body") from exc
    if not isinstance(body, dict):
        raise HTTPException(status_code=422, detail="Expected a JSON object")
    return body


def validate_model(model: type[ModelT], body: dict[str, Any]) -> ModelT:
    """Validate body against a Pydantic model; map errors to HTTP 422."""
    try:
        return model.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
