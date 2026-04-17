import type {
  Zone,
  ZonesApiResponse,
  ForecastResponse,
  AgentAnalysis,
  DispatchResult,
  ReportSubmitResponse,
  ScenariosResponse,
} from "./types";

const rawBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const BASE = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Zones ────────────────────────────────────────────────────────────────────

/** Fetch all zones with scores + backend-computed summary stats */
export async function fetchZonesWithSummary(): Promise<ZonesApiResponse> {
  return get<ZonesApiResponse>("/api/zones");
}

/** Convenience: just the zone list */
export async function fetchZones(): Promise<Zone[]> {
  const data = await fetchZonesWithSummary();
  return data.zones;
}

export async function fetchZone(zoneId: string): Promise<Zone> {
  return get<Zone>(`/api/zones/${zoneId}`);
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export async function fetchForecast(offsetHours: number): Promise<ForecastResponse> {
  return get<ForecastResponse>(`/api/forecast?offset=${offsetHours}`);
}

// ─── What-If ──────────────────────────────────────────────────────────────────

export async function fetchScenarios(): Promise<ScenariosResponse> {
  return get<ScenariosResponse>("/api/scenarios");
}

export async function applyScenario(scenarioId: string | null): Promise<{ message: string }> {
  return post("/api/whatif", { scenario_id: scenarioId });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function analyzeZone(zoneId: string, query?: string): Promise<AgentAnalysis> {
  return post("/api/agent/analyze", { zone_id: zoneId, query });
}

export async function dispatchAlert(
  zoneId: string,
  severity: string,
  message?: string,
  stationId?: string
): Promise<DispatchResult> {
  return post("/api/agent/dispatch", {
    zone_id: zoneId,
    severity,
    message,
    station_id: stationId,
  });
}

export async function fetchAlerts(): Promise<{ alerts: unknown[]; total: number }> {
  return get("/api/agent/alerts");
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function submitReport(report: {
  category: string;
  location: [number, number];
  zone_id?: string;
  description?: string;
}): Promise<ReportSubmitResponse> {
  return post("/api/reports", report);
}

export async function fetchReports(): Promise<{ reports: unknown[]; total: number }> {
  return get("/api/reports");
}
