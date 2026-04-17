"use client";

import { CityStats } from "../lib/types";
import { AlertCircle, Activity, Thermometer, MapPin } from "lucide-react";

export default function DashboardHeader({ stats }: { stats: CityStats | null }) {
  if (!stats) return null;

  return (
    <div className="absolute top-6 left-6 right-6 z-10 flex gap-4 pointer-events-none">
      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 flex-1 flex items-center shadow-lg shadow-black/20 pointer-events-auto transition-all">
        <div className="p-3 bg-red-500/20 rounded-lg mr-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Critical Zones</p>
          <p className="text-2xl font-bold font-mono text-zinc-100">{stats.criticalZones}</p>
        </div>
      </div>
      
      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 flex-1 flex items-center shadow-lg shadow-black/20 pointer-events-auto transition-all">
        <div className="p-3 bg-orange-500/20 rounded-lg mr-4">
          <Activity className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Active Alerts</p>
          <p className="text-2xl font-bold font-mono text-zinc-100">{stats.activeAlerts}</p>
        </div>
      </div>

      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 flex-1 flex items-center shadow-lg shadow-black/20 pointer-events-auto transition-all">
        <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
          <Thermometer className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">City Stress</p>
          <p className={`text-2xl font-bold ${
            stats.cityStress === 'Critical' ? 'text-red-500' :
            stats.cityStress === 'High' ? 'text-orange-500' :
            stats.cityStress === 'Moderate' ? 'text-yellow-500' : 'text-green-500'
          }`}>
            {stats.cityStress}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 flex-1 flex flex-col justify-center shadow-lg shadow-black/20 pointer-events-auto pl-6">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-zinc-400" />
          <h1 className="text-sm font-bold tracking-wide text-zinc-100 uppercase">NammaCity AI</h1>
        </div>
        <p className="text-xs text-zinc-400">Bengaluru Proactive Command Center</p>
      </div>
    </div>
  );
}
