"""Google Maps Platform traffic sampling around Ekana via Routes API."""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import requests

from config.match_config import EKANA_TRAFFIC_BBOX, EKANA_VENUE_CENTER

logger = logging.getLogger(__name__)

ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
_CACHE_TTL_SECONDS = 30
_cache: dict[str, Any] | None = None
_cache_at: float = 0.0

_PLACEHOLDER_KEYS = frozenset(
    {
        "your_google_maps_api_key_here",
        "your_google_cloud_api_key_here",
    }
)


def resolve_google_maps_api_key() -> str | None:
    for name in ("GOOGLE_MAPS_API_KEY", "GOOGLE_CLOUD_API_KEY"):
        value = os.getenv(name, "").strip()
        if value and value not in _PLACEHOLDER_KEYS:
            return value
    return None


def fetch_venue_traffic() -> dict[str, Any]:
    """Traffic-aware congestion near Ekana; degrades when key missing or API fails."""
    global _cache, _cache_at

    now = time.monotonic()
    if _cache is not None and (now - _cache_at) < _CACHE_TTL_SECONDS:
        return dict(_cache)

    key = resolve_google_maps_api_key()
    if not key:
        result = {"congestion_level": "synthetic", "source": "unavailable"}
        _cache = result
        _cache_at = now
        return dict(result)

    try:
        result = _fetch_via_routes_api(key)
    except Exception:
        logger.exception("Google Routes API traffic fetch failed")
        result = {"congestion_level": "unknown", "source": "error"}

    _cache = result
    _cache_at = now
    return dict(result)


def _approach_points() -> list[tuple[float, float]]:
    bbox = EKANA_TRAFFIC_BBOX
    mid_lat = (bbox["min_lat"] + bbox["max_lat"]) / 2
    mid_lon = (bbox["min_lon"] + bbox["max_lon"]) / 2
    return [
        (bbox["max_lat"], mid_lon),
        (bbox["min_lat"], mid_lon),
        (mid_lat, bbox["max_lon"]),
        (mid_lat, bbox["min_lon"]),
    ]


def _fetch_via_routes_api(api_key: str) -> dict[str, Any]:
    dest = (EKANA_VENUE_CENTER["lat"], EKANA_VENUE_CENTER["lng"])
    ratios: list[float] = []

    for origin in _approach_points():
        ratio = _route_delay_ratio(api_key, origin, dest)
        if ratio is not None:
            ratios.append(ratio)

    if not ratios:
        return {"congestion_level": "unknown", "source": "error"}

    avg = sum(ratios) / len(ratios)
    level = "low" if avg < 1.15 else "moderate" if avg < 1.35 else "heavy"
    return {
        "congestion_level": level,
        "traffic_delay_ratio": round(avg, 2),
        "samples": len(ratios),
        "source": "google_routes",
    }


def _route_delay_ratio(
    api_key: str,
    origin: tuple[float, float],
    destination: tuple[float, float],
) -> float | None:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
    }
    body = {
        "origin": {
            "location": {
                "latLng": {"latitude": origin[0], "longitude": origin[1]},
            },
        },
        "destination": {
            "location": {
                "latLng": {"latitude": destination[0], "longitude": destination[1]},
            },
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
    }
    resp = requests.post(
        ROUTES_COMPUTE_URL,
        headers=headers,
        json=body,
        timeout=8,
    )
    if resp.status_code != 200:
        logger.warning("Routes API status %s: %s", resp.status_code, resp.text[:200])
        return None

    routes = resp.json().get("routes") or []
    if not routes:
        return None

    route = routes[0]
    duration = _parse_duration_seconds(str(route.get("duration", "")))
    static_duration = _parse_duration_seconds(str(route.get("staticDuration", "")))
    if duration <= 0 or static_duration <= 0:
        return None
    return duration / static_duration


def _parse_duration_seconds(value: str) -> float:
    value = value.strip()
    if value.endswith("s"):
        return float(value[:-1])
    return float(value) if value else 0.0
