# NammaCity AI

A proactive city intelligence platform for Bengaluru that combines real-time risk scoring, AI-powered analysis, and an interactive 3D map dashboard. The system monitors 12 urban zones across the city for traffic congestion, air pollution, and infrastructure stress -- surfacing actionable insights for city operations staff.

Built with a FastAPI backend, a Next.js frontend with deck.gl 3D visualization, and an agentic AI layer powered by Google Gemini and the Model Context Protocol (MCP).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup and Installation](#setup-and-installation)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Agentic AI System](#agentic-ai-system)
- [Frontend Components](#frontend-components)
- [Configuration](#configuration)
- [License](#license)

---

## Architecture Overview

```
                     +--------------------+
                     |   Next.js Frontend |
                     |   (React + deck.gl)|
                     +--------+-----------+
                              |
                         REST API
                              |
                     +--------v-----------+
                     |   FastAPI Backend   |
                     |   (Scoring Engine)  |
                     +--------+-----------+
                              |
               +--------------+--------------+
               |                             |
      +--------v--------+        +----------v----------+
      |   JSON Data      |        |   MCP Client         |
      |   (zones, events,|        |   (Gemini Orchestrator)
      |    stations,     |        +---------+------------+
      |    scenarios)    |                  |
      +-----------------+           stdio subprocess
                                          |
                                +---------v-----------+
                                |   MCP Server         |
                                |   (5 callable tools) |
                                +----------------------+
```

The system follows a three-layer architecture:

1. **Data Layer** -- Static JSON datasets representing Bengaluru zones, BTP stations, city events, and what-if scenarios.
2. **Intelligence Layer** -- A scoring engine computes real-time risk metrics, while an MCP-based agentic AI system (Gemini Flash) autonomously analyzes zones and dispatches alerts.
3. **Presentation Layer** -- A 3D interactive dashboard with hexagonal heatmaps, zone labels, time-series forecasting, and scenario simulation.

---

## Features

### Real-Time Risk Scoring
- Composite risk score derived from three weighted dimensions: traffic congestion (40%), air pollution (30%), and infrastructure stress (30%).
- Time-of-day modifiers using Gaussian peak functions for morning (9 AM) and evening (6 PM) rush hours.
- Weather impact modifiers for rain (congestion +30%, infra stress +25%, pollution -15%).
- Event-based score adjustments (IPL matches, metro strikes, monsoon flooding, etc.).

### Interactive 3D Map Dashboard
- Hexagonal heatmap layer (deck.gl HexagonLayer) with extruded 3D columns showing risk intensity.
- Clickable zone markers with name labels and pulsing selection rings.
- Multiple map layers: Composite, Congestion, Pollution, Infrastructure Stress.
- Crosshair cursor with nearest-zone fallback click detection.

### Time-Series Forecasting
- 6-hour forecast slider with animated auto-play.
- Backend generates shifted scores per hour using time-of-day modifiers.
- Frontend smoothly transitions between forecast states.

### What-If Scenario Simulation
- Five predefined scenarios: IPL Match at Chinnaswamy, Heavy Monsoon, ORR Blocked, Metro Strike, School Holiday.
- Each scenario applies specific score multipliers to affected zones.
- Instant visual feedback on the map when a scenario is applied.

### Agentic AI Analysis
- Gemini Flash model receives zone context and autonomously decides which MCP tools to call.
- Multi-step tool calling loop (up to 8 iterations) for data gathering, weather assessment, station lookup, alert dispatch, and report generation.
- Structured output with analysis text, actions taken, and extracted recommendations.

### Incident Reporting
- Citizen issue reporting form with category selection (pothole, signal failure, flooding, blocked road, other).
- Comprehensive zone incident report modal with all risk data, contributing factors, recommended actions, and geographic coordinates.
- PDF export using html2pdf.js with a styled A4 layout.
- Print-friendly HTML report generation.

### Real-Time Alert System
- Live alert feed with severity-based styling (critical, warning, info).
- One-click alert dispatch to the nearest BTP station.
- Alert history with timestamps and station assignments.

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| Framework | FastAPI 0.136 |
| Server | Uvicorn |
| AI Model | Google Gemini 3.1 Flash Lite Preview |
| Agent Protocol | Model Context Protocol (MCP) 1.27 |
| Scoring | Custom Python scoring engine |
| Data | JSON flat files |

### Frontend
| Component | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| 3D Map | deck.gl 9.3, MapLibre GL JS 5.23 |
| Charts | Recharts 3.8 |
| PDF Export | html2pdf.js 0.14 |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Project Structure

```
nammacity/
|-- backend/
|   |-- main.py                  # FastAPI app entry point, CORS, router registration
|   |-- scoring.py               # Risk scoring engine (time modifiers, weather, events)
|   |-- mcp_client.py            # Gemini orchestrator + MCP tool calling loop
|   |-- mcp_server/
|   |   |-- server.py            # 5 MCP tools (zone data, weather, stations, alerts, reports)
|   |-- routes/
|   |   |-- zones.py             # GET /api/zones, GET /api/zones/{id}
|   |   |-- forecast.py          # GET /api/forecast?offset=N
|   |   |-- whatif.py            # POST /api/whatif
|   |   |-- reports.py           # POST /api/reports, GET /api/reports
|   |   |-- agent.py             # POST /api/agent/analyze, POST /api/agent/dispatch
|   |-- data/
|   |   |-- zones.json           # 12 Bengaluru zones with base scores and metadata
|   |   |-- stations.json        # BTP station locations, contacts, capacity
|   |   |-- events.json          # Active city events affecting zone scores
|   |   |-- scenarios.json       # What-if scenario definitions and score multipliers
|   |-- .env.example             # Environment variable template
|   |-- requirements.txt         # Python dependencies
|
|-- frontend/
|   |-- app/
|   |   |-- page.tsx             # Main dashboard page (assembles all components)
|   |   |-- layout.tsx           # Root layout with fonts and metadata
|   |   |-- globals.css          # Global styles, glassmorphism, slider, animations
|   |-- components/
|   |   |-- MapView.tsx          # deck.gl + MapLibre 3D hexagonal heatmap
|   |   |-- ZonePanel.tsx        # Slide-out panel showing zone details and scores
|   |   |-- DashboardHeader.tsx  # Top bar with city stats and branding
|   |   |-- TimeSlider.tsx       # 6-hour forecast slider with play/pause
|   |   |-- LayerToggle.tsx      # Map layer selector (composite/congestion/pollution/infra)
|   |   |-- ScenarioDropdown.tsx # What-if scenario selector
|   |   |-- AIAnalysis.tsx       # AI analysis display with tool action log
|   |   |-- ActionButtons.tsx    # Manual actions (dispatch, report, reroute)
|   |   |-- AlertFeed.tsx        # Real-time alert feed sidebar
|   |   |-- ReportForm.tsx       # Citizen issue reporting modal
|   |   |-- ReportModal.tsx      # Comprehensive incident report with PDF download
|   |-- lib/
|   |   |-- api.ts               # API client helpers (fetch wrappers)
|   |   |-- types.ts             # TypeScript type definitions
|   |-- types/
|   |   |-- html2pdf.d.ts        # Type declarations for html2pdf.js
|   |-- .env.local               # Frontend environment variables
|   |-- package.json             # Node dependencies and scripts
```

---

## Setup and Installation

### Prerequisites
- Python 3.11 or higher
- Node.js 20 or higher
- pnpm (recommended) or npm
- A Google Gemini API key (for AI analysis features)

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Environment variables (default values work for local development)
# NEXT_PUBLIC_API_URL defaults to http://localhost:8000
```

---

## Running the Application

### Start the Backend

```bash
cd backend
uvicorn main:app --reload
```

The API server starts at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

### Start the Frontend

```bash
cd frontend
pnpm dev
```

The dashboard opens at `http://localhost:3000`.

### Verify the Connection

1. Open `http://localhost:3000` in your browser.
2. You should see the 3D map of Bengaluru with hexagonal heatmap overlays.
3. Click any zone marker to open the zone panel with live scores.
4. Confirm the backend is responding by checking the dashboard header for city-wide statistics.

---

## API Reference

### Zones

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/zones` | Returns all 12 zones with current scores, factors, and metadata |
| GET | `/api/zones/{zone_id}` | Returns a single zone by ID |

### Forecasting

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forecast?offset=N` | Returns zone scores shifted by N hours (0-6) |

### What-If Scenarios

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/whatif` | Apply a scenario. Body: `{ "scenario_id": "ipl_chinnaswamy" }` |

### Citizen Reports

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports` | Submit a citizen issue report |
| GET | `/api/reports` | List all submitted reports |

### AI Agent

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/agent/analyze` | Run full agentic analysis on a zone (requires Gemini API key) |
| POST | `/api/agent/dispatch` | Dispatch an alert to the nearest BTP station |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API info and available endpoints |
| GET | `/health` | Health check with loaded zone count |

---

## Agentic AI System

The AI analysis pipeline is built on the **Model Context Protocol (MCP)**. When a user requests analysis for a zone, the system:

1. **Spawns an MCP server** as a stdio subprocess exposing 5 tools.
2. **Converts MCP tool schemas** to Gemini function declarations.
3. **Sends zone context** (scores, weather, events) to Gemini Flash with the tool definitions.
4. **Enters a multi-step loop** where Gemini autonomously decides which tools to call and in what order.
5. **Executes tool calls** via MCP, feeds results back to Gemini, and repeats until the model produces a final analysis.
6. **Extracts recommendations** from the response and returns a structured result.

### MCP Tools

| Tool | Description |
|---|---|
| `get_zone_data` | Fetch current risk scores and context for a zone |
| `get_weather_data` | Fetch weather conditions and their impact on a zone |
| `get_nearby_stations` | Find BTP stations near a zone with contact and capacity |
| `dispatch_alert` | Send an alert to a BTP station (action tool) |
| `generate_report` | Create a formal incident report for a zone |

### MCP Resources

| Resource URI | Description |
|---|---|
| `zones://all` | List all zone IDs and names |
| `zones://{zone_id}/scores` | Get current scores for a specific zone |
| `alerts://active` | List all dispatched alerts |

---

## Frontend Components

### MapView
The core visualization component. Renders a MapLibre basemap with three deck.gl layers stacked on top:
- **HexagonLayer** -- Aggregates zone data into extruded hexagonal columns colored by risk level.
- **ScatterplotLayer** -- Clickable zone center markers with selection highlighting.
- **TextLayer** -- Zone name labels rendered at each center point.

### ZonePanel
A slide-out sidebar panel that appears when a zone is selected. Displays the zone name, severity badge, all four risk scores with animated progress bars, contributing factors with impact levels, and manual action buttons.

### TimeSlider
A bottom-centered forecast control with a 0-6 hour range slider, play/pause auto-advance, and time labels showing actual clock times. Triggers API calls to the forecast endpoint on each position change.

### LayerToggle
Four independent floating pill buttons positioned below the TimeSlider. Each button switches the map visualization between Composite, Congestion, Pollution, and Infrastructure Stress views.

### ScenarioDropdown
A dropdown selector with five predefined what-if scenarios. Selecting a scenario sends a POST to the whatif endpoint and refreshes zone data with modified scores.

### ReportModal
A comprehensive incident report viewer with risk score progress bars, contributing factors, recommended actions, nearby stations, and geographic data. Supports direct PDF download via html2pdf.js and print-to-HTML.

---

## Configuration

### Backend Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key from [AI Studio](https://aistudio.google.com/app/apikey) |

### Frontend Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |

---