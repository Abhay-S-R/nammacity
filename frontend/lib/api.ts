import type { Zone, ForecastResponse, AgentAnalysis, DispatchResult } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

export async function fetchZones(): Promise<Zone[]> {
  const data = await get<{ zones: Zone[] }>("/api/zones");
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

export async function applyScenario(scenarioId: string | null): Promise<{ zones: Zone[] }> {
  return post("/api/whatif", { scenario_id: scenarioId });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function analyzeZone(zoneId: string): Promise<AgentAnalysis> {
  return post("/api/agent/analyze", { zone_id: zoneId });
}

export async function dispatchAlert(
  zoneId: string,
  severity: "low" | "medium" | "high" | "critical",
  message: string
): Promise<DispatchResult> {
  return post("/api/agent/dispatch", { zone_id: zoneId, severity, message });
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function submitReport(report: {
  category: string;
  zone_id: string;
  description: string;
}): Promise<{ id: string }> {
  return post("/api/reports", report);
}
