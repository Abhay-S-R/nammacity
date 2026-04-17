"""
NammaCity AI — Forecast Routes
GET /api/forecast?offset=N — Get all zones scored at a future time offset
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Query, Request

from scoring import calculate_all_zones

router = APIRouter(tags=["forecast"])


def _get_current_hour() -> int:
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).hour


@router.get("/forecast")
async def get_forecast(
    request: Request,
    offset: int = Query(default=0, ge=0, le=12, description="Hour offset from current time (0-12)")
):
    """Get zone scores at a future time offset."""
    state = request.state.app_state
    zones = state["zones"]
    weather = state["weather"]
    events = state["events"]
    scenario = state.get("active_scenario")
    
    current_hour = _get_current_hour()
    forecast_hour = (current_hour + offset) % 24
    
    zone_overrides = None
    active_events = [e for e in events if e.get("is_default", False)]
    if scenario:
        zone_overrides = scenario.get("zone_overrides")
        weather = scenario.get("weather", weather)
        scenario_event_ids = scenario.get("active_events", [])
        active_events = [e for e in events if e["id"] in scenario_event_ids]
    
    results = calculate_all_zones(zones, forecast_hour, weather, active_events, zone_overrides)
    
    # Summary for the forecast hour
    critical_count = sum(1 for z in results if z["scores"]["severity"] == "critical")
    warning_count = sum(1 for z in results if z["scores"]["severity"] == "warning")
    avg_composite = round(sum(z["scores"]["composite"] for z in results) / len(results), 1)
    
    if avg_composite >= 6.5:
        city_stress = "Critical"
    elif avg_composite >= 5.0:
        city_stress = "High"
    elif avg_composite >= 3.5:
        city_stress = "Moderate"
    else:
        city_stress = "Low"
    
    return {
        "zones": results,
        "summary": {
            "critical_zones": critical_count,
            "warning_zones": warning_count,
            "active_alerts": len(state.get("alerts", [])),
            "city_stress": city_stress,
            "avg_composite": avg_composite,
            "forecast_hour": forecast_hour,
            "offset": offset,
            "current_hour": current_hour,
            "weather": weather,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
