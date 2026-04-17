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

export interface ZoneFactor {
  type: string;       // "time" | "weather" | "event" | "zone"
  label: string;      // human-readable description
  impact: string;     // "high" | "medium" | "low"
  icon: string;       // icon identifier
}

export interface ZoneScores {
  congestion: number;       // 0–10
  pollution: number;        // 0–10
  infra_stress: number;     // 0–10
  composite: number;        // 0–10 weighted composite
  severity: "critical" | "warning" | "moderate" | "normal";
  trend: "rising" | "stable" | "falling";
  factors: ZoneFactor[];
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

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ZonesApiResponse {
  zones: Zone[];
  summary: {
    critical_zones: number;
    warning_zones: number;
    active_alerts: number;
    city_stress: "Low" | "Moderate" | "High" | "Critical";
    avg_composite: number;
    next_peak_hours: number;
    current_hour: number;
    weather: WeatherData;
  };
  timestamp: string;
}

export interface WeatherData {
  condition: string;
  is_raining: boolean;
  temperature: number;
}

export interface ForecastResponse {
  zones: Zone[];
  summary: {
    critical_zones: number;
    warning_zones: number;
    active_alerts: number;
    city_stress: "Low" | "Moderate" | "High" | "Critical";
    avg_composite: number;
    forecast_hour: number;
    offset: number;
    current_hour: number;
    weather: WeatherData;
  };
  timestamp: string;
}

// ─── Agent Types ───────────────────────────────────────────────────────────────

export interface AgentAnalysis {
  zone_id: string;
  zone_name?: string;
  analysis: string;
  actions_taken: string[];         // backend returns string[] in fallback
  recommendations: string[];
  scores?: ZoneScores;
  model?: string;                  // "rule-based-fallback" or "gemini-flash"
  timestamp?: string;
}

export interface DispatchAlert {
  id: string;
  zone_id: string;
  zone_name: string;
  station_id: string;
  station_name: string;
  severity: string;
  message: string;
  status: string;
  timestamp: string;
}

export interface DispatchResult {
  success: boolean;
  message: string;
  alert: DispatchAlert;
}

// ─── Report Types ──────────────────────────────────────────────────────────────

export type ReportCategory = "pothole" | "signal" | "flooding" | "blocked-road" | "other";

export interface CitizenReport {
  id: string;
  category: string;
  location: [number, number];
  zone_id: string;
  description: string;
  status: string;
  timestamp: string;
}

export interface ReportSubmitResponse {
  message: string;
  report: CitizenReport;
  total_reports: number;
}

// ─── Scenario Types ────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface ScenariosResponse {
  scenarios: Scenario[];
  active_scenario_id: string | null;
}

// ─── Deck.gl Data Types ────────────────────────────────────────────────────────

export interface HexPoint {
  position: [number, number]; // [lng, lat] — Deck.gl order
  weight: number;
  colorWeight: number;
  color: [number, number, number, number];
  zone: Zone;
}

// ─── Summary Stats (derived from backend summary) ──────────────────────────────

export interface CityStats {
  criticalZones: number;
  warningZones: number;
  activeAlerts: number;
  cityStress: "Low" | "Moderate" | "High" | "Critical";
  avgComposite: number;
  nextPeakHours?: number;
  currentHour?: number;
  weather?: WeatherData;
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
    activeAlerts: critical, // proxy
    cityStress: stress,
    avgComposite: avg,
  };
}

/** Build CityStats from the real backend summary object */
export function statsFromSummary(summary: ZonesApiResponse["summary"]): CityStats {
  return {
    criticalZones: summary.critical_zones,
    warningZones: summary.warning_zones,
    activeAlerts: summary.active_alerts,
    cityStress: summary.city_stress,
    avgComposite: summary.avg_composite,
    nextPeakHours: summary.next_peak_hours,
    currentHour: summary.current_hour,
    weather: summary.weather,
  };
}
