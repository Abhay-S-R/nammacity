"""
NammaCity AI — Agent Routes
POST /api/agent/analyze — AI analysis of a zone (with MCP tool calls)
POST /api/agent/dispatch — Dispatch an alert to a BTP station
GET /api/agent/alerts — List dispatched alerts
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import json

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from scoring import calculate_zone_score

router = APIRouter(prefix="/agent", tags=["agent"])


class AnalyzeRequest(BaseModel):
    zone_id: str
    query: Optional[str] = None  # Optional user question about the zone


class DispatchRequest(BaseModel):
    zone_id: str
    severity: str  # critical, warning, moderate
    message: Optional[str] = None
    station_id: Optional[str] = None


# --- Agent Analysis (Gemini + MCP) ---

@router.post("/analyze")
async def analyze_zone(body: AnalyzeRequest, request: Request):
    """
    AI-powered zone analysis using Gemini + MCP tools.
    Falls back to rule-based analysis if Gemini is unavailable.
    """
    state = request.state.app_state
    
    # Find the zone
    zone = next((z for z in state["zones"] if z["id"] == body.zone_id), None)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{body.zone_id}' not found")
    
    # Calculate current scores
    ist = timezone(timedelta(hours=5, minutes=30))
    current_hour = datetime.now(ist).hour
    weather = state["weather"]
    events = state["events"]
    scenario = state.get("active_scenario")
    
    zone_overrides = None
    active_events = events
    if scenario:
        zone_overrides = scenario.get("zone_overrides")
        weather = scenario.get("weather", weather)
        scenario_event_ids = scenario.get("active_events", [])
        active_events = [e for e in events if e["id"] in scenario_event_ids]
    
    scores = calculate_zone_score(zone, current_hour, weather, active_events, zone_overrides)
    
    # Find nearby stations
    station_ids = zone.get("nearby_stations", [])
    stations = [s for s in state["stations"] if s["id"] in station_ids]
    
    # Try MCP + Gemini analysis
    try:
        from mcp_client import run_agent_analysis
        result = await run_agent_analysis(
            zone=zone,
            scores=scores,
            weather=weather,
            stations=stations,
            active_events=active_events,
            query=body.query,
            alerts=state.get("alerts", []),
        )
        return result
    except Exception as e:
        # Fallback to rule-based analysis
        print(f"[Agent] Gemini/MCP unavailable, using fallback: {e}")
        return _fallback_analysis(zone, scores, weather, stations, active_events, current_hour)


@router.post("/dispatch")
async def dispatch_alert(body: DispatchRequest, request: Request):
    """Dispatch an alert to a BTP station."""
    state = request.state.app_state
    
    # Find the zone
    zone = next((z for z in state["zones"] if z["id"] == body.zone_id), None)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{body.zone_id}' not found")
    
    # Find station
    station = None
    if body.station_id:
        station = next((s for s in state["stations"] if s["id"] == body.station_id), None)
    
    if not station:
        # Auto-select nearest station
        station_ids = zone.get("nearby_stations", [])
        if station_ids:
            station = next((s for s in state["stations"] if s["id"] == station_ids[0]), None)
    
    if not station:
        raise HTTPException(status_code=404, detail="No BTP station found for this zone")
    
    # Create alert
    alert = {
        "id": str(uuid.uuid4())[:8],
        "zone_id": body.zone_id,
        "zone_name": zone["name"],
        "station_id": station["id"],
        "station_name": station["name"],
        "severity": body.severity,
        "message": body.message or f"Alert: {body.severity} conditions detected at {zone['name']}",
        "status": "dispatched",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    state["alerts"].append(alert)
    
    return {
        "success": True,
        "alert": alert,
        "message": f"Alert dispatched to {station['name']}"
    }


@router.get("/alerts")
async def list_alerts(request: Request):
    """List all dispatched alerts."""
    state = request.state.app_state
    return {
        "alerts": state.get("alerts", []),
        "total": len(state.get("alerts", []))
    }


# --- Fallback Analysis (No Gemini) ---

def _fallback_analysis(
    zone: dict,
    scores: dict,
    weather: dict,
    stations: list,
    active_events: list,
    current_hour: int
) -> dict:
    """Rule-based analysis when Gemini is unavailable."""
    
    analysis_parts = []
    actions_taken = []
    recommendations = []
    
    # Zone overview
    analysis_parts.append(
        f"**{zone['name']}** — {zone['description']}"
    )
    
    # Severity assessment
    severity = scores["severity"]
    composite = scores["composite"]
    
    if severity == "critical":
        analysis_parts.append(
            f"\n🔴 **CRITICAL STATUS** — Composite stress score: {composite}/10. "
            f"This zone requires immediate attention."
        )
    elif severity == "warning":
        analysis_parts.append(
            f"\n🟡 **WARNING STATUS** — Composite stress score: {composite}/10. "
            f"Conditions are deteriorating."
        )
    else:
        analysis_parts.append(
            f"\n🟢 **{severity.upper()} STATUS** — Composite stress score: {composite}/10."
        )
    
    # Score breakdown
    analysis_parts.append(
        f"\n**Score Breakdown:**\n"
        f"- Congestion: {scores['congestion']}/10 {'🔴' if scores['congestion'] >= 7 else '🟡' if scores['congestion'] >= 5 else '🟢'}\n"
        f"- Pollution: {scores['pollution']}/10 {'🔴' if scores['pollution'] >= 7 else '🟡' if scores['pollution'] >= 5 else '🟢'}\n"
        f"- Infrastructure Stress: {scores['infra_stress']}/10 {'🔴' if scores['infra_stress'] >= 7 else '🟡' if scores['infra_stress'] >= 5 else '🟢'}\n"
        f"- Trend: {scores['trend']} {'📈' if scores['trend'] == 'rising' else '📉' if scores['trend'] == 'falling' else '➡️'}"
    )
    
    # Weather
    if weather.get("is_raining"):
        analysis_parts.append(
            f"\n🌧️ **Weather Impact:** {weather['condition']} - "
            f"Rain is worsening congestion by ~30% and increasing flooding risk."
        )
        actions_taken.append("Checked weather conditions — rain detected")
    
    # Contributing factors
    if scores.get("factors"):
        factor_strs = [f"- {f['label']}" for f in scores["factors"]]
        analysis_parts.append(f"\n**Contributing Factors:**\n" + "\n".join(factor_strs))
    
    # Recommendations based on scores
    if scores["congestion"] >= 7:
        recommendations.append(
            "Deploy additional traffic marshals to major intersections in this zone"
        )
        recommendations.append(
            "Activate alternate route signage on approach roads"
        )
        if stations:
            actions_taken.append(f"Identified nearest station: {stations[0]['name']}")
    
    if scores["pollution"] >= 7:
        recommendations.append(
            "Issue air quality advisory for sensitive groups in this area"
        )
        recommendations.append(
            "Consider temporary heavy vehicle restriction"
        )
    
    if scores["infra_stress"] >= 7:
        recommendations.append(
            "Deploy maintenance crew for drainage/infrastructure check"
        )
        if weather.get("is_raining"):
            recommendations.append(
                "Monitor underpass water levels and activate pumping stations"
            )
    
    if scores["trend"] == "rising":
        recommendations.append(
            "⚠️ Conditions are WORSENING — consider preemptive measures before next peak hour"
        )
    
    if not recommendations:
        recommendations.append("Continue routine monitoring. No immediate action required.")
    
    # Nearby station info
    if stations:
        station_info = ", ".join([f"{s['name']} ({s['capacity']})" for s in stations])
        actions_taken.append(f"Located nearby BTP stations: {station_info}")
    
    return {
        "analysis": "\n".join(analysis_parts),
        "actions_taken": actions_taken,
        "recommendations": recommendations,
        "scores": scores,
        "zone_id": zone["id"],
        "zone_name": zone["name"],
        "model": "rule-based-fallback",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
