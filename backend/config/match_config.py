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

# Ekana / Gomti Nagar area for Google Maps traffic sampling
EKANA_TRAFFIC_BBOX = {
    "min_lat": 26.805,
    "min_lon": 80.995,
    "max_lat": 26.825,
    "max_lon": 81.020,
}

# Stadium centroid for Routes API approach vectors
EKANA_VENUE_CENTER = {
    "lat": 26.815,
    "lng": 81.0075,
}

EKANA_STANDS = (
    "North Block",
    "South Block",
    "East Lounge",
    "West Terrace",
)
SEATS_PER_STAND = 30
