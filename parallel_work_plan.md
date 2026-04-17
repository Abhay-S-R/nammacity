# Phase 2 Remaining Work — Parallel Plan for 3 Devs

## Status Check

Phase 2 has **only 1 item left** (UI Polish). Phase 3 Tier 2 components are also pending. This plan combines both so all 3 devs stay busy with **zero file conflicts**.

---

## 🔴 Conflict Rules

> [!CAUTION]
> **Nobody touches the same file.** Each dev has an exclusive file list below. `page.tsx` is owned by **Dev C only** — they wire everything together at the end.

---

## Dev A — UI Polish & Existing Component Enhancement

**Exclusive files (only Dev A touches these):**
```
frontend/app/globals.css
frontend/app/layout.tsx
frontend/components/DashboardHeader.tsx
frontend/components/TimeSlider.tsx
frontend/components/MapView.tsx
```

### Tasks

#### 1. Upgrade Typography (layout.tsx + globals.css)
- Replace Geist fonts with **Inter** (body) + **JetBrains Mono** (numbers/scores)
- Import via `next/font/google`:
```tsx
import { Inter, JetBrains_Mono } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

#### 2. Add CSS Design System (globals.css)
- Custom CSS variables for the dark command-center theme:
```css
:root {
  --bg-primary: #0a0e17;
  --bg-card: #111827;
  --border-subtle: #1e293b;
  --accent-blue: #3b82f6;
  --risk-green: #22c55e;
  --risk-yellow: #eab308;
  --risk-orange: #f97316;
  --risk-red: #ef4444;
  --glow-blue: 0 0 20px rgba(59, 130, 246, 0.3);
  --glow-red: 0 0 20px rgba(239, 68, 68, 0.4);
}
```
- Glassmorphism utilities: `backdrop-blur`, translucent backgrounds
- Glow animation keyframes for critical zones
- Smooth transition classes (300ms ease on all score changes)

#### 3. Polish DashboardHeader.tsx
- Add glassmorphism card backgrounds (`bg-zinc-900/60 backdrop-blur-md border border-zinc-700/50`)
- Animated number counters for stats
- Pulsing red glow on "Critical Zones" card when count > 0
- Subtle hover scale effect on cards

#### 4. Polish TimeSlider.tsx
- Custom styled range input with glowing track
- Hour labels below the slider
- "NOW" marker at offset 0
- Gradient fill from blue (now) to purple (future)

#### 5. Polish MapView.tsx
- Tune HexagonLayer colors for more dramatic visuals
- Add fog/atmosphere effect if MapLibre supports it
- Improve marker visibility for selected zone (add pulsing ring)

---

## Dev B — New Tier 2 Components (3 brand new files)

**Exclusive files (only Dev B creates/touches these):**
```
frontend/components/ScenarioDropdown.tsx   [NEW]
frontend/components/AlertFeed.tsx          [NEW]
frontend/components/LayerToggle.tsx        [NEW]
```

> [!IMPORTANT]
> Dev B creates **only new files**. No existing files are modified. This means zero merge conflicts.

### Tasks

#### 1. ScenarioDropdown.tsx
- Dropdown with 5-6 presets: "Normal", "IPL Match at Chinnaswamy", "Heavy Monsoon", "ORR Blocked", "Metro Strike", "School Holiday"
- Calls `applyScenario(scenarioId)` from `lib/api.ts` (already exists)
- Props interface:
```tsx
type Props = {
  onScenariosApplied: (zones: Zone[]) => void;
};
```
- Styled as a dark dropdown with icons per scenario
- Position: Top-right area or overlay

#### 2. AlertFeed.tsxine
- Props:
```tsx
type Props = {
  zones: Zone[];
  isOpen: boolean;
  onToggle: () => void;
};
```
- Auto-generates alerts from zones with severity `critical` or `warning`
- Each alert entry: timestamp + icon + message (e.g., "17:32 — Silk Board crossed critical threshold")
- Styled as a scrollable dark panel with colored severity indicators
- Optional: slide-in animation from right

#### 3. LayerToggle.tsx
- 3 toggle buttons: 🚗 Congestion | 🏭 Pollution | 🏗️ Infrastructure
- Plus a default "Composite" option
- Props:
```tsx
type Props = {
  activeLayer: "composite" | "congestion" | "pollution" | "infra_stress";
  onChange: (layer: "composite" | "congestion" | "pollution" | "infra_stress") => void;
};
```
- Styled as a pill-group with active state highlight
- Position: top of the map or below the dashboard header

---

## Dev C — ReportForm + Page Wiring + Integration

**Exclusive files (only Dev C touches these):**
```
frontend/components/ReportForm.tsx         [NEW]
frontend/components/ZonePanel.tsx          (minor: add "Report Issue" button)
frontend/components/ActionButtons.tsx      (minor: wire dispatch to real API)
frontend/components/AIAnalysis.tsx         (minor: integration fixes if needed)
frontend/app/page.tsx                      (OWNS this file — wires everything)
frontend/lib/api.ts                        (add any missing fetch helpers)
```

### Tasks

#### 1. ReportForm.tsx
- Modal or slide-out panel for citizen issue reporting
- Fields:
  - Category dropdown: pothole / signal / flooding / blocked-road / other
  - Zone selector (dropdown of zone names, or click-on-map)
  - Description textarea (optional)
- Calls `submitReport()` from `lib/api.ts` (already exists)
- Success toast: "✅ Report submitted for [Zone Name]"
- Props:
```tsx
type Props = {
  zones: Zone[];
  isOpen: boolean;
  onClose: () => void;
  preselectedZoneId?: string;
};
```

#### 2. Wire ActionButtons.tsx to real dispatch API
- Currently may be using mock toasts — wire to `dispatchAlert()` from api.ts
- Show real confirmation data from backend response

#### 3. Integration: Wire everything into page.tsx
**This is the final assembly step.** After Dev A and Dev B push their work:

Add these state variables to `page.tsx`:
```tsx
const [activeLayer, setActiveLayer] = useState<"composite"|"congestion"|"pollution"|"infra_stress">("composite");
const [showAlertFeed, setShowAlertFeed] = useState(false);
const [showReportForm, setShowReportForm] = useState(false);
```

Import and render:
```tsx
import ScenarioDropdown from "../components/ScenarioDropdown";
import AlertFeed from "../components/AlertFeed";
import LayerToggle from "../components/LayerToggle";
import ReportForm from "../components/ReportForm";

// In the JSX:
<LayerToggle activeLayer={activeLayer} onChange={setActiveLayer} />
<MapView zones={zones} activeLayer={activeLayer} ... />
<ScenarioDropdown onScenariosApplied={(newZones) => { setZones(newZones); setStats(computeCityStats(newZones)); }} />
<AlertFeed zones={zones} isOpen={showAlertFeed} onToggle={() => setShow
- Sidebar or bottom-docked panel showing system alerts timelAlertFeed(!showAlertFeed)} />
<ReportForm zones={zones} isOpen={showReportForm} onClose={() => setShowReportForm(false)} />
```

#### 4. End-to-end testing
- Start backend: `cd backend && uvicorn main:app --reload`
- Start frontend: `cd frontend && npm run dev`
- Test: zones load → map renders → click zone → panel opens → AI analysis works → dispatch alert → toast appears
- Test: time slider → hexagons animate → forecast data updates

---

## File Ownership Matrix

| File | Dev A | Dev B | Dev C |
|---|---|---|---|
| `globals.css` | ✏️ | ❌ | ❌ |
| `layout.tsx` | ✏️ | ❌ | ❌ |
| `DashboardHeader.tsx` | ✏️ | ❌ | ❌ |
| `TimeSlider.tsx` | ✏️ | ❌ | ❌ |
| `MapView.tsx` | ✏️ | ❌ | ❌ |
| `ScenarioDropdown.tsx` | ❌ | ✏️ | ❌ |
| `AlertFeed.tsx` | ❌ | ✏️ | ❌ |
| `LayerToggle.tsx` | ❌ | ✏️ | ❌ |
| `ReportForm.tsx` | ❌ | ❌ | ✏️ |
| `ZonePanel.tsx` | ❌ | ❌ | ✏️ |
| `ActionButtons.tsx` | ❌ | ❌ | ✏️ |
| `AIAnalysis.tsx` | ❌ | ❌ | ✏️ |
| `page.tsx` | ❌ | ❌ | ✏️ |
| `api.ts` | ❌ | ❌ | ✏️ |

> [!NOTE]
> **Zero overlapping files = zero merge conflicts.** Each dev can push to their own branch and merge independently.

---

## Merge Order

```
1. Dev A pushes (styling changes)     ──┐
2. Dev B pushes (new components)      ──┤── Can merge in any order
3. Dev C pushes last (wires page.tsx) ──┘   (Dev C should go LAST to import Dev B's components)
```

> [!TIP]
> **Dev C should merge last** since they're importing Dev B's new components into `page.tsx`. Dev A and Dev B can merge in any order since they don't touch each other's files.

---

## Estimated Time per Dev

| Dev | Effort | Tasks |
|---|---|---|
| **Dev A** | ~3-4 hours | CSS system + 3 component polishes + typography |
| **Dev B** | ~3-4 hours | 3 new self-contained components |
| **Dev C** | ~3-4 hours | 1 new component + integration wiring + testing |

All three finish around the same time. 🎯
