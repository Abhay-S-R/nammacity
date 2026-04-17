"use client";

import { Activity, AlertTriangle, Clock, Map } from "lucide-react";

interface DashboardHeaderProps {
  summary: {
    critical_zones: number;
    warning_zones: number;
    active_alerts: number;
    city_stress: string;
    next_peak_hours: number;
    current_hour: number;
  } | null;
}

export default function DashboardHeader({ summary }: DashboardHeaderProps) {
  if (!summary) return <div className="h-24 animate-pulse bg-card/50 rounded-xl m-4 border border-card-border" />;

  const isStressHigh = summary.city_stress === "Critical" || summary.city_stress === "High";

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 z-10 relative">
      <div className="flex-1 bg-card/80 backdrop-blur-md border border-card-border rounded-xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">NammaCity AI</h1>
          <p className="text-sm text-gray-400">Proactive Intelligence Dashboard</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl">{summary.current_hour}:00 IST</p>
          <p className="text-sm text-gray-400">Bengaluru, KA</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-[2]">
        <StatCard
          icon={<AlertTriangle className="text-risk-critical" />}
          label="Critical Zones"
          value={summary.critical_zones.toString()}
          glow={summary.critical_zones > 0 ? "risk-critical" : "none"}
        />
        <StatCard
          icon={<AlertTriangle className="text-risk-warning" />}
          label="Warning Zones"
          value={summary.warning_zones.toString()}
          glow={summary.warning_zones > 0 ? "risk-warning" : "none"}
        />
        <StatCard
          icon={<Activity className={isStressHigh ? "text-risk-critical" : "text-risk-normal"} />}
          label="City Stress"
          value={summary.city_stress}
          glow={isStressHigh ? "risk-critical" : "none"}
        />
        <StatCard
          icon={<Clock className="text-blue-400" />}
          label="Next Peak"
          value={`In ${summary.next_peak_hours}h`}
          glow="none"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, glow }: { icon: React.ReactNode, label: string, value: string, glow: string }) {
  let glowClass = "";
  if (glow === "risk-critical") glowClass = "shadow-[0_0_15px_rgba(239,68,68,0.2)] border-risk-critical/30";
  else if (glow === "risk-warning") glowClass = "shadow-[0_0_15px_rgba(249,115,22,0.2)] border-risk-warning/30";

  return (
    <div className={`bg-card/80 backdrop-blur-md border border-card-border rounded-xl p-4 flex flex-col justify-center transition-all ${glowClass}`}>
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-mono font-semibold">{value}</div>
    </div>
  );
}
