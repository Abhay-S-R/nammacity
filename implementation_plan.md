# NammaCity AI — Implementation Plan

## Goal
Build a proactive city intelligence dashboard for Bengaluru that forecasts congestion, pollution, and infrastructure stress across city zones — with an agentic AI layer that can analyze situations and dispatch actions. 36-hour hackathon, 4-person team, live demo + pitch + Q&A.

---

## Tech Stack

### Frontend
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Team already has experience (ather-landing-page project). API routes keep everything in one codebase. |
| Styling | **Tailwind CSS** | Rapid iteration for hackathon speed. Dark theme utility classes. |
| Map Engine | **Mapbox GL JS** | Required base layer for Deck.gl. Free tier = 50k loads/month. |
| 3D Visualization | **Deck.gl** (HexagonLayer + ScatterplotLayer) | 3D hexagon columns out of the box. Integrates natively with Mapbox. ~30 lines of config for a stunning result. |
| Charts (if needed) | **Recharts** | Lightweight, React-native. Only for the zone detail panel trend lines. |
| Icons | **Lucide React** | Clean, consistent icon set. |
| Font | **Inter** (Google Fonts) | Modern, clean, great for data-dense UIs. |

### Backend (Python + FastAPI)
| Layer | Choice | Why |
|---|---|---|
| Framework | **FastAPI** | Fastest Python API framework. Auto-generates OpenAPI docs. Async support. |
| Scoring Engine | **Python functions** | Clean math, easy to read, easy to modify during hackathon. |
| Data Storage | **JSON files** (static zone data + scoring params) | Hackathon. No database setup time. Mock data lives in `/data/*.json`. |
| Citizen Reports | **In-memory list** | Reports persist during the demo session. That's all you need. |
| CORS | **FastAPI CORS middleware** | Allows Next.js frontend (port 3000) to call backend (port 8000). |

### AI / Agentic Layer (Python MCP Architecture)
| Layer | Choice | Why |
|---|---|---|
| LLM | **Gemini 2.0 Flash** | Fast response time (~1-2s) — critical for live demo. Good function calling support. Generous free tier. |
| MCP Server | **Python** (`mcp` package) | Reference implementation. Best documented. Most community examples. |
| MCP Client | **Python** (`mcp` client) | Lives in FastAPI backend. Connects to MCP server, discovers tools, orchestrates LLM ↔ tool calls. |
| Transport | **stdio** | MCP server runs as child process spawned by FastAPI. No extra HTTP server needed. |
| Gemini SDK | **`google-genai`** | Official Google AI Python SDK for Gemini function calling. |

**MCP Server Tools (5 tools):**
| Tool | Input | Output | Purpose |
|---|---|---|---|
| `get_zone_data` | `zone_id` | Scores, factors, description | LLM fetches zone context autonomously |
| `get_weather_data` | `zone_id` | Weather conditions, modifiers | LLM checks weather impact |
| `get_nearby_stations` | `zone_id` | BTP station names, contacts | LLM finds who to alert |
| `dispatch_alert` | `zone_id, severity, message, station_id` | Confirmation + timestamp | LLM sends (simulated) alert |
| `generate_report` | `zone_id` | Formal incident report text | LLM creates documentation |

**MCP Server Resources (read-only data):**
| Resource URI | Returns |
|---|---|
| `zones://all` | All zone IDs and names |
| `zones://{id}/scores` | Current scores for a zone |
| `alerts://active` | Currently active alerts |

> [!IMPORTANT]
> **Agentic Autonomy:** The LLM is NOT told which tools to call. It receives the zone context and the full list of available MCP tools, then **autonomously decides** the chain of actions. For example, given a critical zone, Gemini might: (1) `get_zone_data` → (2) `get_weather_data` → (3) `get_nearby_stations` → (4) `dispatch_alert` to the nearest station → (5) `generate_report`. This multi-step autonomous chain is what makes it truly agentic.

### Deployment
| Layer | Choice |
|---|---|
| Frontend Dev | `npm run dev` (port 3000) |
| Backend Dev | `uvicorn main:app --reload` (port 8000) |
| Demo | Frontend on **Vercel**, Backend on **Railway/Render** (free tier). Backup: both run locally on presenter's laptop. |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              NEXT.JS FRONTEND (Port 3000)             │
│                                                      │
│  ┌────────────┐  ┌───────────┐  ┌───────────────┐   │
│  │  Mapbox +   │  │ Dashboard │  │ Zone Detail   │   │
│  │  Deck.gl    │  │ Summary   │  │ Panel +       │   │
│  │  3D Heatmap │  │ Cards     │  │ AI Analysis   │   │
│  └────────────┘  └───────────┘  └───────────────┘   │
│  ┌────────────┐  ┌───────────┐  ┌───────────────┐   │
│  │ Time       │  │ What-If   │  │ Alert Feed    │   │
│  │ Slider     │  │ Dropdown  │  │ + Actions     │   │
│  └────────────┘  └───────────┘  └───────────────┘   │
└──────────────────────────┬───────────────────────────┘
                           │ HTTP (fetch)
                           ▼
┌──────────────────────────────────────────────────────┐
│           PYTHON BACKEND — FastAPI (Port 8000)        │
│                                                      │
│  REST Endpoints:              Agent Endpoints:       │
│  ├── GET  /api/zones          ├── POST /api/agent/   │
│  ├── GET  /api/zones/{id}     │    analyze           │
│  ├── GET  /api/forecast       ├── POST /api/agent/   │
│  ├── POST /api/whatif          │    dispatch          │
│  └── POST /api/reports        └────────┬─────────────│
│                                        │             │
│  ┌─────────────────────┐               │ stdio       │
│  │   SCORING ENGINE    │               ▼             │
│  │  Zone Data (JSON)   │    ┌─────────────────────┐  │
│  │  Weather + Events   │    │  MCP SERVER (Python) │  │
│  │  Time-of-Day Curves │    │                     │  │
│  └─────────────────────┘    │  TOOLS:             │  │
│                              │  ├ get_zone_data()  │  │
│  ┌─────────────────────┐    │  ├ get_weather()     │  │
│  │   MCP CLIENT        │◄──►│  ├ get_stations()    │  │
│  │  (Agent Orchestrator)│    │  ├ dispatch_alert() │  │
│  └─────────┬───────────┘    │  └ generate_report() │  │
│            │                └─────────────────────┘  │
│            ▼                                         │
│  ┌─────────────────────┐                             │
│  │  GEMINI FLASH API   │                             │
│  │  (Function Calling  │                             │
│  │   with MCP Tools)   │                             │
│  └─────────────────────┘                             │
└──────────────────────────────────────────────────────┘
```

---

## Data Architecture

### Zone Definitions (`/data/zones.json`)
Bengaluru divided into **15-20 zones** based on real areas:

```json
{
  "zones": [
    {
      "id": "silk-board",
      "name": "Silk Board Junction",
      "center": [12.9170, 77.6230],
      "type": "traffic-hotspot",
      "base_traffic_load": 9,
      "base_pollution": 6,
      "base_infra_stress": 5,
      "nearby_stations": ["BTP Station Madiwala"],
      "description": "Major interchange connecting ORR, Hosur Road, and BTM"
    }
  ]
}
```

### Suggested Zone List (Real Bengaluru Areas)
| Zone | Type | Why it matters |
|---|---|---|
| Silk Board | Traffic hotspot | India's most infamous junction |
| Hebbal Flyover | Traffic hotspot | North Bengaluru bottleneck |
| Whitefield | IT corridor | Peak-hour overload |
| Electronic City | IT corridor | Southern tech hub |
| KR Puram | Traffic + pollution | Railway junction + industrial |
| Peenya | Industrial/pollution | Manufacturing belt |
| Majestic/Kempegowda | Transit hub | Bus + metro interchange |
| Koramangala | Mixed residential/commercial | Startup hub, weekend congestion |
| Indiranagar | Commercial | Nightlife + commercial traffic |
| MG Road / Brigade Road | Commercial | Central business district |
| Bannerghatta Road | Traffic corridor | Single arterial, no alternatives |
| Marathahalli / ORR | Traffic hotspot | ORR's worst stretch |
| Yelahanka | Residential + Air Force | Emerging congestion |
| Jayanagar | Residential | School-zone traffic |
| Bellandur | IT + residential | Infamous lake + traffic |
| Yeshwanthpur | Industrial + transit | Railway junction |

### Scoring Engine Logic (`backend/scoring.py`)

```python
def calculate_zone_score(zone: dict, time_slot: int, weather: dict, active_events: list) -> dict:
    """Calculate risk scores for a zone based on current conditions."""
    # Base scores from zone data (0-10 scale)
    congestion = zone["base_traffic_load"]
    pollution = zone["base_pollution"]
    infra_stress = zone["base_infra_stress"]

    # Time-of-day modifier (peak hours boost)
    time_modifier = get_time_modifier(time_slot)  # 0.6 off-peak → 1.4 peak
    congestion *= time_modifier

    # Weather modifier
    if weather.get("is_raining"):
        congestion *= 1.3   # 30% worse traffic in rain
        infra_stress *= 1.2  # flooding stress

    # Event modifiers
    for event in active_events:
        if zone["id"] in event["affected_zones"] or "ALL" in event["affected_zones"]:
            congestion += event.get("congestion_impact", 0)
            pollution += event.get("pollution_impact", 0)

    # Clamp to 0-10
    congestion = max(0, min(10, congestion))
    pollution = max(0, min(10, pollution))
    infra_stress = max(0, min(10, infra_stress))

    return {
        "congestion": round(congestion, 1),
        "pollution": round(pollution, 1),
        "infra_stress": round(infra_stress, 1),
        "composite": round(congestion * 0.4 + pollution * 0.3 + infra_stress * 0.3, 1),
        "trend": calculate_trend(zone, time_slot),  # "rising" | "stable" | "falling"
        "factors": build_factors_list(zone, weather, active_events)
    }
```

### Time-of-Day Curve (for 6-hour slider)

```
Modifier
1.4 │        ╱╲           ╱╲
1.2 │      ╱    ╲       ╱    ╲
1.0 │────╱────────╲───╱────────╲────
0.8 │  ╱            ╲╱            ╲
0.6 │╱                              ╲
    └──────────────────────────────────
    6AM  9AM  12PM  3PM  6PM  9PM  12AM
         Peak1       Peak2
```

### Event Modifiers (`backend/data/events.json`)

```json
{
  "events": [
    {
      "id": "ipl-chinnaswamy",
      "name": "IPL Match at Chinnaswamy",
      "affected_zones": ["mg-road", "indiranagar", "koramangala"],
      "congestion_impact": 3,
      "pollution_impact": 1,
      "start_hour": 16,
      "end_hour": 23
    },
    {
      "id": "heavy-rain",
      "name": "Heavy Monsoon Rain",
      "affected_zones": ["ALL"],
      "congestion_impact": 2,
      "pollution_impact": -1,
      "infra_stress_impact": 3
    },
    {
      "id": "school-hours",
      "name": "School Rush Hour",
      "affected_zones": ["koramangala", "jayanagar", "whitefield"],
      "congestion_impact": 2,
      "pollution_impact": 1,
      "start_hour": 7,
      "end_hour": 9
    }
  ]
}
```

---

## Feature Implementation Details

### Tier 1 — Must Ship

#### Feature 1: Deck.gl 3D Heatmap
- **Component:** `MapView.tsx`
- **Layers:**
  - `HexagonLayer` — 3D columns per zone. Height = composite score. Color = severity (green → yellow → orange → red)
  - `ScatterplotLayer` — clickable zone markers with labels
- **Interaction:** Click zone → opens Zone Detail Panel
- **Mapbox Style:** `mapbox://styles/mapbox/dark-v11` (dark theme)

#### Feature 2: 6-Hour Time Slider
- **Component:** `TimeSlider.tsx`
- **Logic:** Slider value = hour offset (0 to +6). On change, calls `GET http://localhost:8000/api/forecast?offset=N`. Backend recalculates all zone scores for that time slot. Frontend animates column heights transitioning.
- **Visual:** Styled range input with hour labels and current time marker

#### Feature 3: Zone Detail Panel
- **Component:** `ZonePanel.tsx`
- **Content:** Zone name, 3 score gauges (congestion/pollution/infra), contributing factors list, trend arrow, AI analysis button
- **Triggered by:** Clicking a zone on the map

#### Feature 4-5: Scoring Engine + Event Modifiers
- **File:** `backend/scoring.py` + `backend/data/zones.json` + `backend/data/events.json`
- **API:** `GET /api/zones` returns all zones with current scores, `GET /api/forecast` returns time-shifted scores
- **Simple math — no ML, no training, no heavy dependencies**

#### Feature 6: LLM Recommendations (MCP Agentic System)
- **API Route:** `POST /api/agent/analyze`
- **Flow:**
  1. Frontend sends `{ zone_id: "silk-board" }` to `POST http://localhost:8000/api/agent/analyze`
  2. FastAPI endpoint creates MCP Client, connects to MCP Server (Python subprocess via stdio)
  3. MCP Client calls `list_tools()` to discover all available tools
  4. Converts MCP tool schemas → Gemini function declarations
  5. Sends zone context + tool declarations to Gemini Flash
  6. Gemini **autonomously decides** which tools to call (multi-step chain)
  7. For each tool call: FastAPI forwards to MCP Server → tool executes → result returned to Gemini
  8. Gemini receives results, may call more tools, then generates final analysis
  9. FastAPI returns to frontend: `{ analysis: "...", actions_taken: [...], recommendations: [...] }`
  10. Frontend displays: AI analysis text + list of actions the agent took
- **System Prompt:**
  > You are a Bengaluru city operations AI agent with access to city management tools. When analyzing a zone, autonomously use your tools to: gather data, assess the situation, and take appropriate actions. You can dispatch alerts to nearby BTP stations, generate incident reports, and check weather impacts. Always explain what you did and why. Reference specific Bengaluru landmarks. Be concise and practical.
- **Key demo moment:** The AI doesn't just *say* what to do — it *does* it. The frontend shows a live log of tool calls the agent made autonomously.

#### Feature 7: Action Buttons
- **Component:** `ActionButtons.tsx` inside Zone Panel
- **Buttons:** "📢 Dispatch Alert" | "📋 Generate Report" | "🔀 Activate Alternate Route Signage"
- **Behavior:** Call `/api/agent/dispatch` → mock success → show toast notification with details
- **Toast example:** "✅ Alert dispatched to BTP Station Madiwala — 'Critical congestion at Silk Board, deploy 3 additional marshals to Junction A'"

#### Feature 8: Summary Cards
- **Component:** `DashboardHeader.tsx`
- **Cards:** "🔴 Critical Zones: 4" | "⚠️ Active Alerts: 2" | "📊 City Stress: High" | "🕐 Next Peak: 2h 15m"
- **Data:** Derived from aggregating all zone scores

#### Feature 9: Dark Command-Center UI
- **Tailwind Config:** Custom dark palette
- **Colors:**
  - Background: `#0a0e17` (near-black with blue tint)
  - Cards: `#111827` with subtle border `#1e293b`
  - Accent: `#3b82f6` (blue) for interactive elements
  - Risk colors: `#22c55e` → `#eab308` → `#f97316` → `#ef4444`
- **Typography:** Inter, with monospace (`JetBrains Mono`) for numbers/scores
- **Effects:** Subtle glow on critical zones, smooth transitions on all score changes

---

### Tier 2 — Add If Time

#### Feature 10: Preset What-If Scenarios
- **Component:** `ScenarioDropdown.tsx`
- **Scenarios:** 5-6 presets (IPL match, monsoon, ORR blocked, metro strike, school holiday)
- **Logic:** Each scenario modifies the event list → scoring engine recalculates → heatmap updates
- **Time:** ~2-3 hours

#### Feature 11: Citizen Issue Reporter
- **Component:** `ReportForm.tsx` (modal or slide-out panel)
- **Fields:** Category dropdown (pothole/signal/flooding/blocked road) + location (click on map) + optional description
- **Backend:** POST `/api/reports` → stores in memory → appears as pins on map → boosts infraStress score for nearest zone
- **Time:** ~3-4 hours

#### Feature 12: Auto-Generated Incident Report
- **Trigger:** Button in Zone Panel → calls Gemini to generate a formal report
- **Output:** Formatted text block styled like an official document (date, zone, situation, recommendations, severity)
- **Time:** ~1-2 hours (mostly prompt engineering)

#### Feature 13: Alert Feed
- **Component:** `AlertFeed.tsx` (sidebar or bottom ticker)
- **Content:** Timeline of system alerts — "17:32 — Silk Board crossed critical threshold" | "17:35 — Alert dispatched to BTP Madiwala"
- **Time:** ~2 hours

#### Feature 14: Layer Toggles
- **Component:** `LayerToggle.tsx` (3 buttons: Congestion / Pollution / Infra)
- **Logic:** Changes which score drives the hex column height and color
- **Time:** ~1-2 hours

---

## Project Structure

```
nammacity-ai/
│
├── frontend/                      # NEXT.JS APP
│   ├── app/
│   │   ├── layout.tsx             # Root layout, fonts, dark theme
│   │   ├── page.tsx               # Main dashboard page
│   │   └── globals.css            # Tailwind + custom CSS
│   ├── components/
│   │   ├── MapView.tsx            # Mapbox + Deck.gl
│   │   ├── DashboardHeader.tsx    # Summary cards
│   │   ├── TimeSlider.tsx         # 6-hour forecast slider
│   │   ├── ZonePanel.tsx          # Zone detail side panel
│   │   ├── ActionButtons.tsx      # Alert dispatch buttons
│   │   ├── AIAnalysis.tsx         # LLM recommendation + agent action log
│   │   ├── AlertFeed.tsx          # Activity log (Tier 2)
│   │   ├── ScenarioDropdown.tsx   # What-If selector (Tier 2)
│   │   ├── ReportForm.tsx         # Citizen reporter (Tier 2)
│   │   └── LayerToggle.tsx        # Congestion/Pollution/Infra (Tier 2)
│   ├── lib/
│   │   ├── api.ts                 # Fetch helpers for backend calls
│   │   └── types.ts               # TypeScript interfaces (shared shapes)
│   ├── public/
│   │   └── fonts/
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                       # PYTHON FASTAPI APP
│   ├── main.py                    # FastAPI app entry point + CORS
│   ├── routes/
│   │   ├── zones.py               # GET /api/zones, GET /api/zones/{id}
│   │   ├── forecast.py            # GET /api/forecast?offset=N
│   │   ├── whatif.py               # POST /api/whatif
│   │   ├── reports.py             # POST /api/reports
│   │   └── agent.py               # POST /api/agent/analyze, /dispatch
│   ├── scoring.py                 # Scoring engine
│   ├── mcp_server/                # MCP SERVER
│   │   ├── server.py              # MCP server entry point
│   │   ├── tools/
│   │   │   ├── get_zone_data.py   # Tool: fetch zone scores
│   │   │   ├── get_weather.py     # Tool: fetch weather for zone
│   │   │   ├── get_stations.py    # Tool: find nearby BTP stations
│   │   │   ├── dispatch_alert.py  # Tool: simulate alert dispatch
│   │   │   └── generate_report.py # Tool: create incident report
│   │   └── resources.py           # MCP resources (zones, alerts)
│   ├── mcp_client.py              # MCP client + Gemini orchestrator
│   ├── data/
│   │   ├── zones.json             # 15-20 Bengaluru zones
│   │   ├── events.json            # Event modifiers
│   │   ├── stations.json          # BTP station data
│   │   └── scenarios.json         # What-If presets
│   └── requirements.txt           # Python dependencies
│
└── README.md
```

---

## Key Dependencies

**Frontend (`frontend/package.json`):**
```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "mapbox-gl": "^3.4",
    "@deck.gl/core": "^9.0",
    "@deck.gl/layers": "^9.0",
    "@deck.gl/aggregation-layers": "^9.0",
    "@deck.gl/mapbox": "^9.0",
    "recharts": "^2.12",
    "lucide-react": "^0.400",
    "sonner": "^1.5"
  },
  "devDependencies": {
    "tailwindcss": "^4.0",
    "typescript": "^5.4",
    "@types/mapbox-gl": "^3.1"
  }
}
```

**Backend (`backend/requirements.txt`):**
```
fastapi==0.115.*
uvicorn==0.32.*
mcp>=1.0
google-genai>=1.0
pydantic>=2.0
python-dotenv>=1.0
```

> [!NOTE]
> - `sonner` on frontend is for toast notifications (dispatch confirmations)
> - `mcp` is the official Python MCP SDK (includes both server and client)
> - `google-genai` is the official Google AI Python SDK for Gemini
> - Tailwind v4 comes with `create-next-app`
> - Backend runs with `uvicorn main:app --reload` for hot-reloading during development

---

## Phased Timeline (36 Hours)

### Phase 1: Foundation (Hours 0–8)
- [ ] **All (30 min):** Define API contract — agree on JSON response shapes, write `types.ts`
- [ ] **Frontend:** Initialize Next.js in `frontend/`, configure Tailwind dark theme
- [ ] **Frontend:** Set up Mapbox with dark style + basic Bengaluru view
- [ ] **Backend:** Initialize FastAPI in `backend/`, set up CORS, create project structure
- [ ] **Backend:** Create zone data JSON files (all 15-20 zones with coordinates + base scores)
- [ ] **Backend:** Build scoring engine (`scoring.py`) + `GET /api/zones` and `GET /api/forecast`
- [ ] **MCP:** Set up MCP server skeleton with one working tool (`get_zone_data`)
- [ ] **Frontend:** Get Deck.gl HexagonLayer rendering with data from backend API
- **Milestone:** Map shows colored 3D columns for Bengaluru zones. Backend API returns scored data. MCP server has one working tool.

### Phase 2: Core Features (Hours 8–20)
- [ ] **Frontend:** Build DashboardHeader with summary cards
- [ ] **Frontend:** Build TimeSlider → wired to backend `/api/forecast` → columns animate
- [ ] **Frontend:** Build ZonePanel (click zone → detail slides in)
- [ ] **Frontend:** Build ActionButtons with toast notifications
- [ ] **Backend:** Build remaining MCP tools (weather, stations, dispatch, report)
- [ ] **Backend:** Build MCP Client + Gemini integration (`mcp_client.py`)
- [ ] **Backend:** Build `POST /api/agent/analyze` → agent orchestration endpoint
- [ ] **Frontend:** Build AIAnalysis component — display analysis + agent action log
- [ ] **Frontend:** Polish the dark UI — glow effects, transitions, typography
- **Milestone:** Full interactive demo flow works end-to-end. Agent autonomously calls tools.

### Phase 3: Tier 2 + Integration (Hours 20–28)
- [ ] Add What-If scenario dropdown — `POST /api/whatif` + frontend component
- [ ] Add citizen reporter form — `POST /api/reports` + frontend modal
- [ ] Add alert feed sidebar
- [ ] Add layer toggles (congestion/pollution/infra)
- [ ] Fix all integration bugs (frontend ↔ backend)
- [ ] Cross-browser testing
- [ ] Deploy frontend to Vercel, backend to Railway/Render
- **Milestone:** Polished, deployed, all Tier 1 features bulletproof.

### Phase 4: Demo Prep (Hours 28–36)
- [ ] **STOP WRITING NEW CODE**
- [ ] Script the demo golden path (exact clicks, exact order)
- [ ] Prepare backup plan (local fallback — run both `npm run dev` and `uvicorn` on presenter's laptop)
- [ ] Write pitch script (2-3 minutes)
- [ ] Prepare for Q&A (expected questions + answers)
- [ ] Run the demo 3+ times as rehearsal
- [ ] Ensure Gemini API key has quota remaining
- [ ] Test both deployed URLs end-to-end
- **Milestone:** Every team member can run the demo solo.

---

## Demo Golden Path (Scripted Flow)

1. **Open dashboard** → Show the dark command-center UI, summary cards at top ("4 Critical Zones, City Stress: High")
2. **Pan the 3D heatmap** → Show Bengaluru with 3D columns. "Red columns are crisis zones. Height shows severity."
3. **Slide the time slider forward 3 hours** → Columns animate. "We can predict that Silk Board will go critical by 6 PM."
4. **Click Silk Board** → Zone panel slides in with scores, factors ("Peak hour + Rain + IPL match nearby")
5. **Click "AI Analysis"** → Gemini generates recommendations in 1-2 seconds. Read one aloud. "Deploy 3 additional marshals. Activate alternate route signage on Hosur Road."
6. **Click "Dispatch Alert"** → Toast: "✅ Alert sent to BTP Station Madiwala"
7. **Open What-If dropdown** → Select "What if ORR is blocked?" → Heatmap shifts, new zones go red. "Planners can simulate scenarios before making decisions."
8. **Close:** "NammaCity AI gives city teams the heads-up they need — before a crisis, not after."

---

## Team Allocation (4 Developers)

| Dev | Role | Language | Phase 1 (0-8h) | Phase 2 (8-20h) | Phase 3-4 (20-36h) |
|---|---|---|---|---|---|
| **A** | Frontend Lead | TypeScript | Next.js setup, Tailwind dark theme, layout shell, Mapbox basic view | DashboardHeader, TimeSlider, ZonePanel, ActionButtons | Polish, transitions, demo prep |
| **B** | Visualization | TypeScript | Deck.gl setup, HexagonLayer config, zone markers | Wire slider → deck.gl animations, AIAnalysis component, layer toggles | Integration with backend, bug fixes |
| **C** | Backend + Data | Python | FastAPI setup, zone/event JSON files, scoring engine, REST endpoints | `/api/forecast`, `/api/whatif`, citizen reporter, edge cases | What-If scenarios, deploy backend |
| **D** | MCP + Agent | Python | MCP Server setup, define all 5 tools, test tools via CLI | MCP Client, Gemini integration, agentic tool chain, `/api/agent/*` | Polish agent responses, cache backup |

> [!IMPORTANT]
> **Hour 0 task (all 4 devs, 30 minutes):** Define the API contract together. What does `GET /api/zones` return? What JSON shape does the frontend expect? Write it in a shared doc or `frontend/lib/types.ts`. Dev C and D code to this contract in Python. Dev A and B consume it in TypeScript.

> [!TIP]
> **Dev C and D pair closely.** The scoring engine (C) feeds the MCP tools (D). They share the `backend/data/` directory and should agree on function interfaces early. 
> **Dev A and B pair closely.** A builds the component shells, B fills them with Deck.gl and data visualization.

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Deck.gl doesn't render properly | Fallback: Use Mapbox's native circle/fill layers with color-coding. Less flashy but works. Budget 1 hour for the fallback. |
| Gemini API is slow during demo | Pre-cache 3-4 common zone analyses in a dict. If API latency > 3s, serve cached response. |
| Gemini API key runs out of quota | Have GPT-4 key as backup. Swap `google-genai` call for `openai` — same function calling pattern. |
| Map doesn't load (Mapbox key issue) | Test with a free Mapbox token before the hackathon. Have a screenshot fallback. |
| Frontend ↔ Backend CORS issues | Set up CORS in FastAPI `main.py` from hour 0. Allow `http://localhost:3000`. |
| Backend crashes during demo | Run both local + deployed. If deployed backend fails, switch frontend env to `localhost:8000`. |
| MCP server subprocess fails | Have a direct-call fallback in `mcp_client.py` — if MCP connection fails, call tool functions directly (bypassing MCP protocol). Same results, less impressive architecture, but demo works. |
