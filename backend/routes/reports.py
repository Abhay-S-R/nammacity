"""
NammaCity AI — Citizen Reports Routes
POST /api/reports — Submit a citizen report
GET /api/reports — List all reports
"""

from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(tags=["reports"])


class ReportSubmission(BaseModel):
    category: str  # pothole, signal, flooding, blocked-road, other
    location: list[float]  # [lat, lng]
    zone_id: Optional[str] = None
    description: Optional[str] = None


@router.post("/reports")
async def submit_report(body: ReportSubmission, request: Request):
    """Submit a citizen issue report."""
    state = request.state.app_state
    
    # Find nearest zone if not specified
    zone_id = body.zone_id
    if not zone_id:
        zone_id = _find_nearest_zone(body.location, state["zones"])
    
    report = {
        "id": str(uuid.uuid4())[:8],
        "category": body.category,
        "location": body.location,
        "zone_id": zone_id,
        "description": body.description or "",
        "status": "submitted",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    state["reports"].append(report)
    
    return {
        "message": "Report submitted successfully",
        "report": report,
        "total_reports": len(state["reports"])
    }


@router.get("/reports")
async def list_reports(request: Request):
    """List all citizen reports."""
    state = request.state.app_state
    return {
        "reports": state["reports"],
        "total": len(state["reports"])
    }


def _find_nearest_zone(location: list, zones: list) -> str:
    """Find nearest zone to a given lat/lng."""
    min_dist = float("inf")
    nearest = zones[0]["id"]
    
    for zone in zones:
        lat_diff = location[0] - zone["center"][0]
        lng_diff = location[1] - zone["center"][1]
        dist = (lat_diff ** 2 + lng_diff ** 2) ** 0.5
        if dist < min_dist:
            min_dist = dist
            nearest = zone["id"]
    
    return nearest
