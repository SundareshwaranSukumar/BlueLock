"""Today's anchor fixture and venue constants for live data pipelines."""

from __future__ import annotations

# LSG vs PBKS at Ekana Cricket Stadium (IPL-style anchor for May 23, 2026)
HOME_TEAM = "Lucknow Super Giants"
HOME_SHORT = "LSG"
AWAY_TEAM = "Punjab Kings"
AWAY_SHORT = "PBKS"
VENUE = "Ekana Cricket Stadium"
VENUE_CITY = "Lucknow"

# CricAPI current matches filter / RapidAPI team aliases
CRICAPI_TEAM_A = "Lucknow Super Giants"
CRICAPI_TEAM_B = "Punjab Kings"

# TomTom Traffic Flow bounding box (approx Ekana / Gomti Nagar)
TOMTOM_BBOX = {
    "min_lat": 26.805,
    "min_lon": 80.995,
    "max_lat": 26.825,
    "max_lon": 81.020,
}

EKANA_STANDS = (
    "North Block",
    "South Block",
    "East Lounge",
    "West Terrace",
)
SEATS_PER_STAND = 30
