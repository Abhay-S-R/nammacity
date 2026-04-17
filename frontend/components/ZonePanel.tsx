"use client";

import { Zone } from "../lib/types";
import { X, AlertTriangle, TrendingUp, TrendingDown, Minus, Car, Wind, Home } from "lucide-react";
import ActionButtons from "./ActionButtons";
import AIAnalysis from "./AIAnalysis";

type ZonePanelProps = {
  zone: Zone | null;
  onClose: () => void;
};

// Helper for color coding scores
const getScoreColor = (score: number) => {
  if (score >= 8) return "text-red-500";
  if (score >= 6) return "text-orange-500";
  if (score >= 4) return "text-yellow-500";
  return "text-green-500";
};

const getScoreBgColor = (score: number) => {
  if (score >= 8) return "bg-red-500";
  if (score >= 6) return "bg-orange-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-green-500";
};

export default function ZonePanel({ zone, onClose }: ZonePanelProps) {
  if (!zone) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-full max-w-md bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 z-20 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300">
              {zone.type.replace("-", " ")}
            </span>
            {zone.scores.composite >= 7 && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-red-500/20 text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Critical
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">{zone.name}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {/* Description */}
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          {zone.description}
        </p>

        {/* Scores */}
        <div className="space-y-4 mb-8">
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-zinc-300">Composite Risk</span>
              <div className="flex items-center gap-2">
                {zone.scores.trend === "rising" ? <TrendingUp className="w-4 h-4 text-red-500" /> :
                 zone.scores.trend === "falling" ? <TrendingDown className="w-4 h-4 text-green-500" /> :
                 <Minus className="w-4 h-4 text-zinc-500" />}
                <span className={`text-xl font-bold font-mono ${getScoreColor(zone.scores.composite)}`}>
                  {zone.scores.composite.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-1 overflow-hidden">
              <div className={`h-1.5 rounded-full ${getScoreBgColor(zone.scores.composite)} transition-all duration-500`} style={{ width: `${(zone.scores.composite / 10) * 100}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ScoreTile icon={<Car/>} label="Traffic" score={zone.scores.congestion} />
            <ScoreTile icon={<Wind/>} label="Pollution" score={zone.scores.pollution} />
            <ScoreTile icon={<Home/>} label="Infra" score={zone.scores.infra_stress} />
          </div>
        </div>

        {/* Factors */}
        {zone.scores.factors && zone.scores.factors.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Contributing Factors</h3>
            <ul className="space-y-2">
              {zone.scores.factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300 bg-zinc-900/30 p-2 rounded border border-zinc-800">
                  <span className="text-blue-500 mt-0.5">•</span> {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Agent Analysis */}
        <div className="mb-8">
          <AIAnalysis zoneId={zone.id} />
        </div>

        {/* Dispatch Actions */}
        <ActionButtons zone={zone} />
      </div>
    </div>
  );
}

function ScoreTile({ icon, label, score }: { icon: React.ReactNode, label: string, score: number }) {
  return (
    <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col items-center justify-center gap-1">
      <div className={`text-zinc-400 w-4 h-4 [&>svg]:w-4 [&>svg]:h-4 mb-1`}>{icon}</div>
      <span className={`text-lg font-bold font-mono ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>
      <div className="w-full bg-zinc-800 rounded-full h-1 mt-1 overflow-hidden">
        <div className={`h-1 rounded-full ${getScoreBgColor(score)} transition-all`} style={{ width: `${(score / 10) * 100}%` }}></div>
      </div>
    </div>
  );
}
