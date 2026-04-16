"""
NammaCity AI — What-If Scenario Routes
POST /api/whatif — Activate/deactivate a what-if scenario
GET /api/scenarios — List available scenarios
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["whatif"])


class WhatIfRequest(BaseModel):
    scenario_id: Optional[str] = None  # None = reset to default


@router.get("/scenarios")
async def list_scenarios(request: Request):
    """List all available what-if scenarios."""
    state = request.state.app_state
    scenarios = state["scenarios"]
    active = state.get("active_scenario")
    
    return {
        "scenarios": [
            {
                "id": s["id"],
                "name": s["name"],
                "description": s["description"],
                "is_active": active is not None and active.get("id") == s["id"]
            }
            for s in scenarios
        ],
        "active_scenario_id": active["id"] if active else None
    }


@router.post("/whatif")
async def activate_scenario(body: WhatIfRequest, request: Request):
    """Activate a what-if scenario or reset to default."""
    state = request.state.app_state
    
    if body.scenario_id is None:
        # Reset to default
        state["active_scenario"] = None
        state["weather"] = {
            "condition": "Partly Cloudy",
            "is_raining": False,
            "temperature": 28
        }
        return {"message": "Reset to default conditions", "active_scenario": None}
    
    # Find the scenario
    scenario = next((s for s in state["scenarios"] if s["id"] == body.scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{body.scenario_id}' not found")
    
    state["active_scenario"] = scenario
    if "weather" in scenario:
        state["weather"] = scenario["weather"]
    
    return {
        "message": f"Activated scenario: {scenario['name']}",
        "active_scenario": {
            "id": scenario["id"],
            "name": scenario["name"],
            "description": scenario["description"]
        }
    }
