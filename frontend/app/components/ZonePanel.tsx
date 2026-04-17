"use client";

import { X, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { ZoneData } from "@/lib/types";
import ActionButtons from "./ActionButtons"; // We'll build this next

interface ZonePanelProps {
  zoneData: ZoneData | null;
  onClose: () => void;
}

export default function ZonePanel({ zoneData, onClose }: ZonePanelProps) {
  if (!zoneData) return null;

  const { scores } = zoneData;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising": return <TrendingUp className="w-5 h-5 text-risk-critical" />;
      case "falling": return <TrendingDown className="w-5 h-5 text-risk-normal" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="absolute right-4 top-28 bottom-4 w-96 bg-card/95 backdrop-blur-xl border border-card-border rounded-2xl shadow-2xl overflow-y-auto z-10 flex flex-col p-6 animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{zoneData.name}</h2>
          <p className="text-sm text-gray-400 mt-1 capitalize">{zoneData.type.replace("-", " ")}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm text-gray-300 mb-8 leading-relaxed">
        {zoneData.description}
      </p>

      {/* Main Composite Score */}
      <div className="flex items-center justify-between bg-black/40 rounded-xl p-4 mb-6 border border-white/5">
        <div>
          <div className="text-sm text-gray-400 mb-1">Composite Score</div>
          <div className="flex items-center gap-2">
            <span className={`text-4xl font-mono font-bold text-risk-${scores.severity}`}>
              {scores.composite.toFixed(1)}
            </span>
            <span className="text-gray-500 font-mono">/10</span>
          </div>
        </div>
        <div className="text-center bg-white/5 px-4 py-2 rounded-lg">
          <div className="text-xs text-gray-400 mb-1 block">Trend</div>
          {getTrendIcon(scores.trend)}
        </div>
      </div>

      {/* Individual Gauges */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <ScoreGauge label="Traffic" value={scores.congestion} />
        <ScoreGauge label="Pollution" value={scores.pollution} />
        <ScoreGauge label="Infra" value={scores.infra_stress} />
      </div>

      {/* Contributing Factors */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-card-border pb-2">
        Contributing Factors
      </h3>
      <div className="flex flex-col gap-3 mb-8">
        {scores.factors.length > 0 ? scores.factors.map((factor, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
            <Info className={`w-5 h-5 mt-0.5 ${factor.impact === 'high' ? 'text-risk-critical' : 'text-blue-400'}`} />
            <div>
              <div className="text-sm font-medium">{factor.label}</div>
              <div className="text-xs text-gray-400 capitalize">Impact: {factor.impact}</div>
            </div>
          </div>
        )) : (
          <div className="text-sm text-gray-500 italic">No significant factors</div>
        )}
      </div>

      {/* Spacing for Action Buttons */}
      <div className="flex-1" />
      
      <ActionButtons zoneId={zoneData.id} severity={scores.severity} />
    </div>
  );
}

function ScoreGauge({ label, value }: { label: string, value: number }) {
  // Determine color based on individual 0-10 score
  let color = "bg-risk-normal";
  if (value >= 7.5) color = "bg-risk-critical";
  else if (value >= 5.5) color = "bg-risk-warning";
  else if (value >= 3.5) color = "bg-risk-moderate";

  return (
    <div className="bg-black/30 rounded-lg p-3 text-center border border-white/5">
      <div className="text-xs text-gray-400 mb-2">{label}</div>
      <div className="text-xl font-mono mb-2">{value.toFixed(1)}</div>
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${(value / 10) * 100}%` }} />
      </div>
    </div>
  );
}
