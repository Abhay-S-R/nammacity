"""
NammaCity AI — Zone Routes
GET /api/zones — All zones with current scores
GET /api/zones/{zone_id} — Single zone detail
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from scoring import calculate_zone_score, calculate_all_zones

router = APIRouter(tags=["zones"])


def _get_current_hour() -> int:
    """Get current hour in IST (UTC+5:30)."""
    from datetime import timezone, timedelta
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).hour


@router.get("/zones")
async def get_all_zones(request: Request):
    """Get all zones with current calculated scores."""
    state = request.state.app_state
    zones = state["zones"]
    weather = state["weather"]
    events = state["events"]
    scenario = state.get("active_scenario")
    
    current_hour = _get_current_hour()
    
    # Get zone overrides from active scenario
    zone_overrides = None
    active_events = events  # Default events always active
    
    if scenario:
        zone_overrides = scenario.get("zone_overrides")
        weather = scenario.get("weather", weather)
        # Add scenario-specific events
        scenario_event_ids = scenario.get("active_events", [])
        active_events = [e for e in events if e["id"] in scenario_event_ids]
    
    results = calculate_all_zones(zones, current_hour, weather, active_events, zone_overrides)
    
    # Summary stats
    critical_count = sum(1 for z in results if z["scores"]["severity"] == "critical")
    warning_count = sum(1 for z in results if z["scores"]["severity"] == "warning")
    avg_composite = round(sum(z["scores"]["composite"] for z in results) / len(results), 1)
    
    # City stress level
    if avg_composite >= 6.5:
        city_stress = "Critical"
    elif avg_composite >= 5.0:
        city_stress = "High"
    elif avg_composite >= 3.5:
        city_stress = "Moderate"
    else:
        city_stress = "Low"
    
    # Next peak calculation
    next_peak_hours = _hours_to_next_peak(current_hour)
    
    return {
        "zones": results,
        "summary": {
            "critical_zones": critical_count,
            "warning_zones": warning_count,
            "active_alerts": len(state.get("alerts", [])),
            "city_stress": city_stress,
            "avg_composite": avg_composite,
            "next_peak_hours": next_peak_hours,
            "current_hour": current_hour,
            "weather": weather,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/zones/{zone_id}")
async def get_zone(zone_id: str, request: Request):
    """Get detailed data for a single zone."""
    state = request.state.app_state
    zones = state["zones"]
    weather = state["weather"]
    events = state["events"]
    scenario = state.get("active_scenario")
    
    zone = next((z for z in zones if z["id"] == zone_id), None)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")
    
    current_hour = _get_current_hour()
    
    zone_overrides = None
    active_events = events
    if scenario:
        zone_overrides = scenario.get("zone_overrides")
        weather = scenario.get("weather", weather)
        scenario_event_ids = scenario.get("active_events", [])
        active_events = [e for e in events if e["id"] in scenario_event_ids]
    
    scores = calculate_zone_score(zone, current_hour, weather, active_events, zone_overrides)
    
    # Get 6-hour forecast for this zone
    forecast = []
    for offset in range(7):
        future_hour = (current_hour + offset) % 24
        future_scores = calculate_zone_score(zone, future_hour, weather, active_events, zone_overrides)
        forecast.append({
            "hour": future_hour,
            "offset": offset,
            "scores": future_scores
        })
    
    # Find nearby stations
    station_ids = zone.get("nearby_stations", [])
    stations = [s for s in state["stations"] if s["id"] in station_ids]
    
    # Get zone-specific alerts
    zone_alerts = [a for a in state.get("alerts", []) if a.get("zone_id") == zone_id]
    
    return {
        "id": zone["id"],
        "name": zone["name"],
        "center": zone["center"],
        "type": zone["type"],
        "description": zone["description"],
        "scores": scores,
        "forecast": forecast,
        "nearby_stations": stations,
        "alerts": zone_alerts,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


def _hours_to_next_peak(current_hour: int) -> float:
    """Calculate hours until next traffic peak."""
    morning_peak = 9  # 9 AM
    evening_peak = 18  # 6 PM
    
    if current_hour < morning_peak:
        return morning_peak - current_hour
    elif current_hour < 12:
        return evening_peak - current_hour
    elif current_hour < evening_peak:
        return evening_peak - current_hour
    else:
        # Next morning peak (next day)
        return (24 - current_hour) + morning_peak
