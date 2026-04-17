"""
NammaCity AI — MCP Server
Exposes 5 tools for the agentic AI layer to autonomously use:
  1. get_zone_data   — fetch zone scores and context
  2. get_weather_data — fetch current weather conditions
  3. get_nearby_stations — find nearby BTP stations
  4. dispatch_alert  — send alert to a BTP station
  5. generate_report — create a formal incident report

Run via stdio transport (spawned by mcp_client.py as a subprocess).
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

from mcp.server.fastmcp import FastMCP

# --- Data Loading ---
DATA_DIR = Path(__file__).parent.parent / "data"


def _load_json(filename: str):
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


# Load data once at import time (server is a long-running subprocess)
_zones_data = _load_json("zones.json")["zones"]
_stations_data = _load_json("stations.json")["stations"]
_events_data = _load_json("events.json")["events"]

# In-memory alert store for this server session
_dispatched_alerts: list[dict] = []

# Default weather (can be overridden in a real integration)
_weather = {
    "condition": "Partly Cloudy",
    "is_raining": False,
    "temperature": 28,
    "humidity": 65,
    "wind_speed_kmh": 12,
}


def _get_current_hour() -> int:
    """Get current hour in IST (UTC+5:30)."""
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).hour


def _find_zone(zone_id: str) -> dict | None:
    return next((z for z in _zones_data if z["id"] == zone_id), None)


# --- Scoring (inline, lightweight version for MCP server) ---

import math


def _time_modifier(hour: int) -> float:
    morning = 1.4 * math.exp(-0.5 * ((hour - 9) / 1.5) ** 2)
    evening = 1.4 * math.exp(-0.5 * ((hour - 18) / 1.8) ** 2)
    return max(0.5, min(1.5, 0.5 + morning + evening))


def _calculate_scores(zone: dict, hour: int) -> dict:
    """Quick score calculation for a zone."""
    congestion = float(zone["base_traffic_load"]) * _time_modifier(hour)
    pollution = float(zone["base_pollution"])
    infra_stress = float(zone["base_infra_stress"])

    if _weather.get("is_raining"):
        congestion *= 1.3
        infra_stress *= 1.25
        pollution *= 0.85

    congestion = max(0.0, min(10.0, congestion))
    pollution = max(0.0, min(10.0, pollution))
    infra_stress = max(0.0, min(10.0, infra_stress))
    composite = congestion * 0.4 + pollution * 0.3 + infra_stress * 0.3

    if composite >= 7.5:
        severity = "critical"
    elif composite >= 5.5:
        severity = "warning"
    elif composite >= 3.5:
        severity = "moderate"
    else:
        severity = "normal"

    return {
        "congestion": round(congestion, 1),
        "pollution": round(pollution, 1),
        "infra_stress": round(infra_stress, 1),
        "composite": round(composite, 1),
        "severity": severity,
    }


# --- MCP Server Setup ---

mcp = FastMCP("NammaCity AI")


# ===== TOOL 1: get_zone_data =====
@mcp.tool()
def get_zone_data(zone_id: str) -> str:
    """
    Fetch current risk scores and context for a specific Bengaluru zone.
    Returns zone name, type, description, current congestion/pollution/infra scores,
    composite risk score, and severity level.
    """
    zone = _find_zone(zone_id)
    if not zone:
        return json.dumps({"error": f"Zone '{zone_id}' not found", "available_zones": [z["id"] for z in _zones_data]})

    hour = _get_current_hour()
    scores = _calculate_scores(zone, hour)

    return json.dumps({
        "zone_id": zone["id"],
        "name": zone["name"],
        "type": zone["type"],
        "description": zone["description"],
        "center": zone["center"],
        "current_hour_ist": hour,
        "scores": scores,
        "nearby_station_ids": zone.get("nearby_stations", []),
    }, indent=2)


# ===== TOOL 2: get_weather_data =====
@mcp.tool()
def get_weather_data(zone_id: str) -> str:
    """
    Fetch current weather conditions affecting a zone.
    Returns temperature, rain status, humidity, and how weather is impacting
    traffic and infrastructure in the zone.
    """
    zone = _find_zone(zone_id)
    if not zone:
        return json.dumps({"error": f"Zone '{zone_id}' not found"})

    impact = []
    if _weather.get("is_raining"):
        impact.append("Rain is increasing congestion by ~30%")
        impact.append("Flooding risk elevated for infrastructure")
        if zone["type"] in ("it-residential", "traffic-hotspot"):
            impact.append(f"Zone type '{zone['type']}' is especially vulnerable to rain-related delays")
    if _weather.get("temperature", 28) > 35:
        impact.append("High temperature is increasing pollution levels by ~15%")
    if not impact:
        impact.append("Weather conditions are not significantly impacting this zone")

    return json.dumps({
        "zone_id": zone_id,
        "zone_name": zone["name"],
        "weather": _weather,
        "weather_impacts": impact,
    }, indent=2)


# ===== TOOL 3: get_nearby_stations =====
@mcp.tool()
def get_nearby_stations(zone_id: str) -> str:
    """
    Find BTP (Bengaluru Traffic Police) stations near a zone.
    Returns station names, contact info, capacity, and jurisdiction.
    Use this to identify who to dispatch alerts to.
    """
    zone = _find_zone(zone_id)
    if not zone:
        return json.dumps({"error": f"Zone '{zone_id}' not found"})

    station_ids = zone.get("nearby_stations", [])
    stations = [s for s in _stations_data if s["id"] in station_ids]

    if not stations:
        return json.dumps({
            "zone_id": zone_id,
            "message": "No BTP stations found nearby",
            "stations": [],
        })

    return json.dumps({
        "zone_id": zone_id,
        "zone_name": zone["name"],
        "nearby_stations": [
            {
                "id": s["id"],
                "name": s["name"],
                "contact": s["contact"],
                "capacity": s["capacity"],
                "jurisdiction_zones": s["jurisdiction_zones"],
            }
            for s in stations
        ],
    }, indent=2)


# ===== TOOL 4: dispatch_alert =====
@mcp.tool()
def dispatch_alert(zone_id: str, severity: str, message: str, station_id: str = "") -> str:
    """
    Dispatch a traffic/safety alert to a BTP station for a zone.
    Severity must be one of: critical, high, medium.
    If station_id is not provided, automatically selects the nearest station.
    This is an ACTION tool — it creates a real alert in the system.
    """
    zone = _find_zone(zone_id)
    if not zone:
        return json.dumps({"error": f"Zone '{zone_id}' not found"})

    # Find station
    station = None
    if station_id:
        station = next((s for s in _stations_data if s["id"] == station_id), None)

    if not station:
        # Auto-select nearest station
        station_ids = zone.get("nearby_stations", [])
        if station_ids:
            station = next((s for s in _stations_data if s["id"] == station_ids[0]), None)

    if not station:
        return json.dumps({"error": "No BTP station available for this zone"})

    alert = {
        "id": f"ALT-{str(uuid.uuid4())[:6].upper()}",
        "zone_id": zone_id,
        "zone_name": zone["name"],
        "station_id": station["id"],
        "station_name": station["name"],
        "severity": severity,
        "message": message,
        "status": "dispatched",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    _dispatched_alerts.append(alert)

    return json.dumps({
        "success": True,
        "alert": alert,
        "confirmation": f"Alert dispatched to {station['name']}. Station has {station['capacity']} available.",
    }, indent=2)


# ===== TOOL 5: generate_report =====
@mcp.tool()
def generate_report(zone_id: str) -> str:
    """
    Generate a formal incident report for a zone based on current conditions.
    Returns a structured report with timestamp, zone details, scores, and assessment.
    Use this after analyzing a zone to create official documentation.
    """
    zone = _find_zone(zone_id)
    if not zone:
        return json.dumps({"error": f"Zone '{zone_id}' not found"})

    hour = _get_current_hour()
    scores = _calculate_scores(zone, hour)
    ist = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(ist)

    report = {
        "report_id": f"RPT-{str(uuid.uuid4())[:6].upper()}",
        "generated_at": now.strftime("%Y-%m-%d %H:%M IST"),
        "zone": {
            "id": zone["id"],
            "name": zone["name"],
            "type": zone["type"],
            "description": zone["description"],
        },
        "current_scores": scores,
        "weather": _weather,
        "active_alerts_for_zone": [
            a for a in _dispatched_alerts if a["zone_id"] == zone_id
        ],
        "assessment": (
            f"INCIDENT REPORT — {zone['name']}\n"
            f"Date/Time: {now.strftime('%Y-%m-%d %H:%M IST')}\n"
            f"Zone Type: {zone['type']}\n"
            f"Composite Risk Score: {scores['composite']}/10 ({scores['severity'].upper()})\n"
            f"---\n"
            f"Congestion: {scores['congestion']}/10\n"
            f"Pollution: {scores['pollution']}/10\n"
            f"Infrastructure Stress: {scores['infra_stress']}/10\n"
            f"---\n"
            f"Weather: {_weather['condition']}, {_weather['temperature']}°C"
            f"{', RAIN ACTIVE' if _weather['is_raining'] else ''}\n"
            f"---\n"
            f"Zone Description: {zone['description']}\n"
        ),
    }

    return json.dumps(report, indent=2)


# ===== MCP Resources =====

@mcp.resource("zones://all")
def list_all_zones() -> str:
    """List all available zone IDs and names."""
    return json.dumps([
        {"id": z["id"], "name": z["name"], "type": z["type"]}
        for z in _zones_data
    ], indent=2)


@mcp.resource("zones://{zone_id}/scores")
def get_zone_scores(zone_id: str) -> str:
    """Get current scores for a specific zone."""
    zone = _find_zone(zone_id)
    if not zone:
        return json.dumps({"error": f"Zone '{zone_id}' not found"})
    hour = _get_current_hour()
    scores = _calculate_scores(zone, hour)
    return json.dumps({"zone_id": zone_id, "scores": scores}, indent=2)


@mcp.resource("alerts://active")
def list_active_alerts() -> str:
    """List all currently active/dispatched alerts."""
    return json.dumps(_dispatched_alerts, indent=2)


# --- Entry Point ---
if __name__ == "__main__":
    mcp.run(transport="stdio")
