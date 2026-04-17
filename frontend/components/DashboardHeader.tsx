"use client";

import { CityStats } from "../lib/types";
import { AlertCircle, Activity, Thermometer, MapPin, Radio } from "lucide-react";

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "red" | "orange" | "blue" | "green";
  pulse?: boolean;
  delay?: number;
};

function StatCard({ icon, label, value, color, pulse, delay = 0 }: StatCardProps) {
  const colorMap = {
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      iconBg: "bg-red-500/15",
      text: "text-red-400",
      glow: pulse ? "pulse-glow-red" : "",
    },
    orange: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      iconBg: "bg-orange-500/15",
      text: "text-orange-400",
      glow: "",
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      iconBg: "bg-blue-500/15",
      text: "text-blue-400",
      glow: "",
    },
    green: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      iconBg: "bg-emerald-500/15",
      text: "text-emerald-400",
      glow: "",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={`glass-card gradient-border p-4 flex-1 flex items-center pointer-events-auto 
        hover:scale-[1.02] transition-all duration-300 ease-out cursor-default group ${c.glow}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`p-2.5 rounded-xl ${c.iconBg} mr-3.5 transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.12em] leading-none mb-1.5">
          {label}
        </p>
        <p className={`text-2xl font-bold score-number leading-none ${c.text}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DashboardHeader({ stats }: { stats: CityStats | null }) {
  if (!stats) return null;

  const stressColor =
    stats.cityStress === "Critical" ? "red" :
    stats.cityStress === "High" ? "orange" :
    stats.cityStress === "Moderate" ? "blue" : "green";

  return (
    <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
      {/* Title Bar */}
      <div className="flex items-center gap-3 mb-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 glass-card-sm px-4 py-2">
          <div className="p-1.5 rounded-lg bg-blue-500/15">
            <Radio className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-100 uppercase leading-none">
              NammaCity AI
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Bengaluru Command Center</p>
          </div>
          <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-700/50">
            <div className="live-dot" />
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-3 stagger-children">
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-red-400" />}
          label="Critical Zones"
          value={stats.criticalZones}
          color="red"
          pulse={stats.criticalZones > 0}
          delay={0}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-orange-400" />}
          label="Active Alerts"
          value={stats.activeAlerts}
          color="orange"
          delay={80}
        />
        <StatCard
          icon={<Thermometer className="w-5 h-5 text-blue-400" />}
          label="City Stress"
          value={stats.cityStress}
          color={stressColor}
          delay={160}
        />
        <StatCard
          icon={<MapPin className="w-5 h-5 text-emerald-400" />}
          label="Warning Zones"
          value={stats.warningZones}
          color="green"
          delay={240}
        />
      </div>
    </div>
  );
}
