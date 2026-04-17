"use client";

import { useState } from "react";
import { analyzeZone } from "../lib/api";
import { AgentAnalysis } from "../lib/types";
import { Sparkles, Terminal, CheckCircle2, RefreshCw } from "lucide-react";

export default function AIAnalysis({ zoneId }: { zoneId: string }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeZone(zoneId);
      setAnalysis(result);
    } catch (err) {
      console.error("Agent analysis failed:", err);
      setError("Could not reach AI agent. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // Initial state — show button
  if (!analysis && !loading && !error) {
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
            <p className="text-xs text-zinc-500 font-medium">
              Click to run autonomous assessment
            </p>
          </div>
        </div>
      </button>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-4">
        <p className="text-sm text-red-400 mb-3">{error}</p>
        <button
          onClick={runAnalysis}
          className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-3 bg-zinc-800/50 border-b border-zinc-800 justify-between flex items-center">
        <div className="flex justify-center items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm text-zinc-200">
            {analysis?.model === "rule-based-fallback"
              ? "Rule-Based Analysis"
              : "Gemini Flash Agent"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />}
          {analysis && (
            <button
              onClick={runAnalysis}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Re-run analysis"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 text-sm">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs">
              <Terminal className="w-3 h-3" />
              <span className="animate-pulse">Analyzing zone &amp; invoking tools...</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-zinc-800 rounded w-full animate-pulse"></div>
              <div className="h-2 bg-zinc-800 rounded w-5/6 animate-pulse"></div>
              <div className="h-2 bg-zinc-800 rounded w-4/6 animate-pulse"></div>
            </div>
          </div>
        ) : analysis ? (
          <>
            {/* Analysis Text */}
            <div className="text-zinc-300 leading-relaxed border-l-2 border-blue-500 pl-3 whitespace-pre-line">
              {analysis.analysis}
            </div>

            {/* Actions Taken */}
            {analysis.actions_taken && analysis.actions_taken.length > 0 && (
              <div className="space-y-1 mt-4">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Actions Taken
                </h4>
                {analysis.actions_taken.map((action, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-start text-xs font-mono bg-black/40 p-2 rounded text-zinc-400"
                  >
                    <span className="text-blue-500 shrink-0">➜</span>
                    <span className="text-emerald-400 break-words">{action}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800/50">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 items-start text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
