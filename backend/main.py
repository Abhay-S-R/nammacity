"""
NammaCity AI — FastAPI Backend Entry Point
"""

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import zones, forecast, whatif, reports, agent


# --- Data Loading ---
DATA_DIR = Path(__file__).parent / "data"


def load_json(filename: str) -> dict:
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


# Global app state
app_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load data on startup."""
    app_state["zones"] = load_json("zones.json")["zones"]
    app_state["events"] = load_json("events.json")["events"]
    app_state["stations"] = load_json("stations.json")["stations"]
    app_state["scenarios"] = load_json("scenarios.json")["scenarios"]
    app_state["reports"] = []  # In-memory citizen reports
    app_state["alerts"] = []  # In-memory dispatched alerts
    app_state["active_scenario"] = None  # Currently active what-if scenario
    
    # Default weather
    app_state["weather"] = {
        "condition": "Partly Cloudy",
        "is_raining": False,
        "temperature": 28
    }
    
    yield
    # Cleanup (nothing to do)


# --- App Setup ---
app = FastAPI(
    title="NammaCity AI",
    description="Proactive city intelligence dashboard for Bengaluru",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Make app_state accessible to routes ---
@app.middleware("http")
async def inject_state(request, call_next):
    request.state.app_state = app_state
    response = await call_next(request)
    return response


# --- Register Routers ---
app.include_router(zones.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(whatif.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(agent.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": "NammaCity AI",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": [
            "GET /api/zones",
            "GET /api/zones/{zone_id}",
            "GET /api/forecast",
            "POST /api/whatif",
            "POST /api/reports",
            "POST /api/agent/analyze",
            "POST /api/agent/dispatch",
        ]
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "zones_loaded": len(app_state.get("zones", []))}
