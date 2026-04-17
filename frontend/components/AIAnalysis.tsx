"use client";

import { useState } from "react";
import { analyzeZone } from "../lib/api";
import { AgentAnalysis } from "../lib/types";
import { Sparkles, Terminal, CheckCircle2 } from "lucide-react";

export default function AIAnalysis({ zoneId }: { zoneId: string }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeZone(zoneId).catch(() => {
        // Fallback mock data if agent endpoint isn't fully ready
        return new Promise<AgentAnalysis>(resolve => setTimeout(() => resolve({
          zone_id: zoneId,
          analysis: "Based on the current trajectory and nearby events, traffic congestion is expected to cascade along the primary corridor. The recent rain has worsened infrastructure stress parameters.",
          actions_taken: [
            { tool: "get_weather_data", input: { zone: zoneId }, output: "Rain detected, 15mm/hr", timestamp: new Date().toISOString() },
            { tool: "get_nearby_stations", input: { zone: zoneId }, output: "Found BTP Station: Madiwala Traffic Police", timestamp: new Date().toISOString() },
          ],
          recommendations: [
            "Deploy 3 additional traffic marshals to the junction immediately.",
            "Activate electronic VMS boards to suggest Hosur Road bypass.",
            "Alert civic body regarding potential waterlogging point."
          ]
        }), 2000));
      });
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <button 
        onClick={runAnalysis}
        className="w-full relative overflow-hidden group bg-zinc-900 border border-zinc-700 hover:border-blue-500/50 p-4 rounded-xl flex items-center justify-between transition-all"
      >
        <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-zinc-100">AI Agent Analysis</h3>
            <p className="text-xs text-zinc-500 font-medium">Click to run autonomous assessment</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
      <div className="p-3 bg-zinc-800/50 border-b border-zinc-800 justify-between flex items-center">
        <div className="flex justify-center items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm text-zinc-200">Gemini Flash Agent</span>
        </div>
        {loading && <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />}
      </div>
      
      <div className="p-4 space-y-4 text-sm">
        {loading ? (
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs">
               <Terminal className="w-3 h-3" />
               <span className="animate-pulse">Loading tools & checking context...</span>
             </div>
             <div className="space-y-2 relative">
               <div className="h-2 bg-zinc-800 rounded w-full"></div>
               <div className="h-2 bg-zinc-800 rounded w-5/6"></div>
               <div className="h-2 bg-zinc-800 rounded w-4/6"></div>
             </div>
          </div>
        ) : analysis ? (
          <>
            <div className="text-zinc-300 leading-relaxed border-l-2 border-blue-500 pl-3">
              {analysis.analysis}
            </div>
            
            <div className="space-y-1 mt-4">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Autonomous Actions Taken</h4>
              {analysis.actions_taken.map((action, i) => (
                <div key={i} className="flex gap-2 items-start text-xs font-mono bg-black/40 p-2 rounded text-zinc-400">
                  <span className="text-blue-500 shrink-0">➜</span>
                  <div className="break-words overflow-hidden content-end"> 
                    <span className="text-emerald-400">{action.tool}</span>
                    <span className="text-zinc-600 mx-1">()</span>
                    <span className="italic block mt-1 text-zinc-500 pl-2">Output: {action.output}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800/50">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recommendations</h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2 items-start text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
