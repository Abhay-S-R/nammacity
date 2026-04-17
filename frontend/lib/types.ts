// ─── Zone Types ──────────────────────────────────────────────────────────────

export type ZoneType =
  | "traffic-hotspot"
  | "it-corridor"
  | "traffic-pollution"
  | "industrial"
  | "transit-hub"
  | "mixed"
  | "commercial"
  | "traffic-corridor"
  | "residential"
  | "it-residential"
  | "industrial-transit";

export interface ZoneScores {
  congestion: number;       // 0–10
  pollution: number;        // 0–10
  infra_stress: number;     // 0–10
  composite: number;        // 0–10 weighted composite
  trend: "rising" | "stable" | "falling";
  factors: string[];        // human-readable factor descriptions
}

export interface Zone {
  id: string;
  name: string;
  center: [number, number]; // [lat, lng]
  type: ZoneType;
  description: string;
  nearby_stations: string[];
  scores: ZoneScores;
}

// ─── Forecast Types ────────────────────────────────────────────────────────────

export interface ForecastResponse {
  offset_hours: number;
  forecast_time: string; // ISO string
  zones: Zone[];
}

// ─── Agent Types ───────────────────────────────────────────────────────────────

export interface AgentAction {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  timestamp: string;
}

export interface AgentAnalysis {
  zone_id: string;
  analysis: string;
  actions_taken: AgentAction[];
  recommendations: string[];
}

export interface DispatchResult {
  success: boolean;
  message: string;
  alert_id: string;
  timestamp: string;
}

// ─── Report Types ──────────────────────────────────────────────────────────────

export type ReportCategory = "pothole" | "signal" | "flooding" | "blocked-road" | "other";

export interface CitizenReport {
  id: string;
  category: ReportCategory;
  zone_id: string;
  description: string;
  timestamp: string;
}

// ─── Deck.gl Data Types ────────────────────────────────────────────────────────

export interface HexPoint {
  position: [number, number]; // [lng, lat] — Deck.gl order
  weight: number;
  zone: Zone;
}

// ─── Summary Stats (derived) ───────────────────────────────────────────────────

export interface CityStats {
  criticalZones: number;
  warningZones: number;
  activeAlerts: number;
  cityStress: "Low" | "Moderate" | "High" | "Critical";
  avgComposite: number;
}

export function computeCityStats(zones: Zone[]): CityStats {
  const critical = zones.filter((z) => z.scores.composite >= 7).length;
  const warning = zones.filter(
    (z) => z.scores.composite >= 5 && z.scores.composite < 7
  ).length;
  const avg = zones.reduce((sum, z) => sum + z.scores.composite, 0) / (zones.length || 1);

  let stress: CityStats["cityStress"] = "Low";
  if (avg >= 7) stress = "Critical";
  else if (avg >= 5.5) stress = "High";
  else if (avg >= 4) stress = "Moderate";

  return {
    criticalZones: critical,
    warningZones: warning,
    activeAlerts: critical, // proxy for demo
    cityStress: stress,
    avgComposite: avg,
  };
}
