"use client";

import { Zone, ZoneFactor } from "../lib/types";
import { X, Download, Printer, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

type ReportModalProps = {
  zone: Zone;
  isOpen: boolean;
  onClose: () => void;
};

const severityLabel: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  warning: { label: "WARNING", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  moderate: { label: "MODERATE", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  normal: { label: "NORMAL", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

function getScoreBar(score: number): string {
  const filled = Math.round(score * 2); // 0-20
  return "█".repeat(filled) + "░".repeat(20 - filled);
}

function formatTimestamp(): string {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function ReportModal({ zone, isOpen, onClose }: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const s = zone.scores;
  const sev = severityLabel[s.severity] || severityLabel.normal;
  const timestamp = formatTimestamp();
  const reportId = `RPT-${zone.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  // Build score bar for PDF
  const pdfScoreBar = (score: number, color: string) => {
    const pct = (score / 10) * 100;
    return `<div style="display:flex;align-items:center;gap:12px;margin:6px 0">
      <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
      </div>
      <span style="font-weight:700;font-family:monospace;color:${color};min-width:40px;text-align:right">${score.toFixed(1)}</span>
    </div>`;
  };

  const getColor = (score: number) =>
    score >= 8 ? "#dc2626" : score >= 6 ? "#ea580c" : score >= 4 ? "#ca8a04" : "#16a34a";

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Build recommendations for PDF
      const pdfRecs: string[] = [];
      if (s.congestion >= 7) {
        pdfRecs.push("Deploy additional traffic marshals to major intersections.");
        pdfRecs.push("Activate alternate route signage on approach roads.");
      }
      if (s.pollution >= 7) {
        pdfRecs.push("Issue air quality advisory for sensitive groups.");
        pdfRecs.push("Consider temporary heavy vehicle restriction.");
      }
      if (s.infra_stress >= 7) {
        pdfRecs.push("Deploy maintenance crew for drainage/infra check.");
        pdfRecs.push("Monitor underpass water levels and activate pumping stations.");
      }
      if (s.composite >= 5 && s.composite < 7) {
        pdfRecs.push("Increase patrol frequency in the zone.");
      }
      if (s.trend === "rising") {
        pdfRecs.push("Conditions are WORSENING — consider preemptive measures.");
      }
      if (pdfRecs.length === 0) {
        pdfRecs.push("Continue routine monitoring. No immediate action required.");
      }

      // Build factors HTML
      const factorsHtml = s.factors && s.factors.length > 0
        ? s.factors.map((f: ZoneFactor) => {
            const dotColor = f.impact === "high" ? "#dc2626" : f.impact === "medium" ? "#ca8a04" : "#16a34a";
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin:4px 0">
              <span style="display:flex;align-items:center;gap:8px">
                <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block"></span>
                ${f.label}
              </span>
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:${dotColor}">${f.impact}</span>
            </div>`;
          }).join("")
        : `<p style="color:#9ca3af;font-style:italic">No specific contributing factors identified.</p>`;

      const pdfHtml = `
        <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a1a;padding:0;line-height:1.5">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1e3a5f,#0f172a);color:white;padding:28px 32px;border-radius:12px;margin-bottom:24px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:0.5px">NammaCity AI</h1>
                <p style="margin:4px 0 0;font-size:12px;opacity:0.7;letter-spacing:0.1em;text-transform:uppercase">Zone Incident Report</p>
              </div>
              <div style="text-align:right">
                <span style="display:inline-block;padding:4px 14px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.08em;background:${sev.color};color:white">${sev.label}</span>
              </div>
            </div>
          </div>

          <!-- Meta Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
              <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em">Report ID</p>
              <p style="margin:4px 0 0;font-size:13px;font-weight:600;font-family:monospace">${reportId}</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
              <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em">Generated</p>
              <p style="margin:4px 0 0;font-size:13px;font-weight:600">${timestamp}</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
              <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em">Zone</p>
              <p style="margin:4px 0 0;font-size:13px;font-weight:600">${zone.name} (${zone.id})</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
              <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em">Type</p>
              <p style="margin:4px 0 0;font-size:13px;font-weight:600;text-transform:capitalize">${zone.type.replace(/-/g, " ")}</p>
            </div>
          </div>

          <!-- Description -->
          <div style="margin-bottom:24px">
            <h2 style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 10px">Description</h2>
            <p style="font-size:14px;color:#334155;margin:0">${zone.description}</p>
          </div>

          <!-- Risk Scores -->
          <div style="margin-bottom:24px">
            <h2 style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Risk Assessment</h2>
            <div style="margin-bottom:4px"><span style="font-size:13px;color:#475569">Composite Risk</span>${pdfScoreBar(s.composite, getColor(s.composite))}</div>
            <div style="margin-bottom:4px"><span style="font-size:13px;color:#475569">Traffic Congestion</span>${pdfScoreBar(s.congestion, getColor(s.congestion))}</div>
            <div style="margin-bottom:4px"><span style="font-size:13px;color:#475569">Air Pollution (AQI Proxy)</span>${pdfScoreBar(s.pollution, getColor(s.pollution))}</div>
            <div style="margin-bottom:4px"><span style="font-size:13px;color:#475569">Infrastructure Stress</span>${pdfScoreBar(s.infra_stress, getColor(s.infra_stress))}</div>
            <p style="font-size:13px;color:#475569;margin:8px 0 0">Trend: <strong style="color:${s.trend === "rising" ? "#dc2626" : s.trend === "falling" ? "#16a34a" : "#475569"}">${s.trend === "rising" ? "Rising" : s.trend === "falling" ? "Falling" : "Stable"}</strong></p>
          </div>

          <!-- Contributing Factors -->
          <div style="margin-bottom:24px">
            <h2 style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Contributing Factors</h2>
            ${factorsHtml}
          </div>

          <!-- Recommended Actions -->
          <div style="margin-bottom:24px">
            <h2 style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Recommended Actions</h2>
            ${pdfRecs.map((r, i) => `<div style="display:flex;gap:10px;padding:10px 12px;background:${i % 2 === 0 ? "#f0f9ff" : "#f8fafc"};border:1px solid #e2e8f0;border-radius:6px;margin:4px 0;font-size:13px">
              <span style="color:#2563eb;font-weight:700;font-family:monospace">${String(i + 1).padStart(2, "0")}.</span>
              <span>${r}</span>
            </div>`).join("")}
          </div>

          <!-- Nearby Stations -->
          <div style="margin-bottom:24px">
            <h2 style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Nearby BTP Stations</h2>
            ${zone.nearby_stations.length > 0
              ? zone.nearby_stations.map(st => `<p style="margin:4px 0;font-size:13px">● ${st}</p>`).join("")
              : `<p style="color:#9ca3af;font-style:italic">No nearby stations listed.</p>`}
          </div>

          <!-- Geographic Data -->
          <div style="margin-bottom:24px">
            <h2 style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Geographic Data</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
                <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase">Latitude</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;font-family:monospace">${zone.center[0]}</p>
              </div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
                <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase">Longitude</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;font-family:monospace">${zone.center[1]}</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:16px 0;border-top:2px solid #e2e8f0;margin-top:8px">
            <p style="margin:0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em">NammaCity AI · Bengaluru City Intelligence Platform · Auto-Generated Report</p>
          </div>
        </div>
      `;

      // Use an iframe to isolate from WebGL canvas on the main page
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "210mm";
      iframe.style.height = "100vh";
      iframe.style.zIndex = "-1";
      iframe.style.opacity = "0.01";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Could not access iframe document");

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>body{margin:0;padding:20px;background:#fff;}</style></head><body><div id="pdf-root">${pdfHtml}</div></body></html>`);
      iframeDoc.close();

      // Wait for iframe content to render
      await new Promise((resolve) => setTimeout(resolve, 300));

      const targetEl = iframeDoc.getElementById("pdf-root");
      if (!targetEl) throw new Error("PDF root not found in iframe");

      const html2pdf = (await import("html2pdf.js")).default;

      await html2pdf()
        .set({
          margin: [10, 12, 10, 12],
          filename: `NammaCity_Report_${zone.id}_${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(targetEl)
        .save();

      document.body.removeChild(iframe);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (reportRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>NammaCity AI — ${zone.name} Report</title>
              <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fff; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { font-size: 22px; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
                h2 { font-size: 16px; color: #333; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                .score-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
                .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; }
                .factor { padding: 4px 0; }
                .meta { color: #666; font-size: 13px; }
                @media print { body { padding: 20px; } }
              </style>
            </head>
            <body>
              ${reportRef.current.innerHTML}
              <p style="margin-top:32px;color:#999;font-size:11px;text-align:center;">
                Generated by NammaCity AI • Bengaluru City Intelligence • ${timestamp}
              </p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Build recommendations list
  const recommendations: string[] = [];
  if (s.congestion >= 7) {
    recommendations.push("Deploy additional traffic marshals to major intersections in this zone.");
    recommendations.push("Activate alternate route signage on approach roads.");
  }
  if (s.pollution >= 7) {
    recommendations.push("Issue air quality advisory for sensitive groups in this area.");
    recommendations.push("Consider temporary heavy vehicle restriction.");
  }
  if (s.infra_stress >= 7) {
    recommendations.push("Deploy maintenance crew for drainage/infrastructure check.");
    recommendations.push("Monitor underpass water levels and activate pumping stations.");
  }
  if (s.composite >= 5 && s.composite < 7) {
    recommendations.push("Increase patrol frequency in the zone.");
    recommendations.push("Prepare standby teams for rapid deployment if conditions worsen.");
  }
  if (s.trend === "rising") {
    recommendations.push("⚠️ Conditions are WORSENING — consider preemptive measures before next peak hour.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue routine monitoring. No immediate action required.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Zone Incident Report</h2>
              <p className="text-xs text-zinc-500 font-mono">{reportId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-300 transition-colors"
              title="Download as PDF"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
              title="Print report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div ref={reportRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Zone Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{zone.name}</h1>
              <span
                className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded"
                style={{ color: sev.color, background: sev.bg }}
              >
                {sev.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              Zone ID: {zone.id} · Type: {zone.type.replace(/-/g, " ")} · Generated: {timestamp}
            </p>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{zone.description}</p>
          </div>

          <hr className="border-zinc-800" />

          {/* Risk Scores */}
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Risk Assessment</h2>
            <div className="space-y-3">
              <ScoreRow label="Composite Risk" score={s.composite} />
              <ScoreRow label="Traffic Congestion" score={s.congestion} />
              <ScoreRow label="Air Pollution (AQI Proxy)" score={s.pollution} />
              <ScoreRow label="Infrastructure Stress" score={s.infra_stress} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Trend:</span>
              <span className={`font-semibold ${
                s.trend === "rising" ? "text-red-400" :
                s.trend === "falling" ? "text-green-400" : "text-zinc-400"
              }`}>
                {s.trend === "rising" ? "📈 Rising" : s.trend === "falling" ? "📉 Falling" : "➡️ Stable"}
              </span>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Contributing Factors */}
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Contributing Factors</h2>
            {s.factors && s.factors.length > 0 ? (
              <div className="space-y-2">
                {s.factors.map((f: ZoneFactor, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        f.impact === "high" ? "bg-red-500" :
                        f.impact === "medium" ? "bg-yellow-500" : "bg-green-500"
                      }`} />
                      <span className="text-zinc-300">{f.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      f.impact === "high" ? "text-red-400" :
                      f.impact === "medium" ? "text-yellow-400" : "text-green-400"
                    }`}>{f.impact}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">No specific contributing factors identified at this time.</p>
            )}
          </div>

          <hr className="border-zinc-800" />

          {/* Recommended Actions */}
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Recommended Actions
            </h2>
            <ol className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800">
                  <span className="text-blue-500 font-bold font-mono shrink-0">{String(i + 1).padStart(2, "0")}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
          </div>

          <hr className="border-zinc-800" />

          {/* Nearby Stations */}
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Nearby BTP Stations</h2>
            {zone.nearby_stations.length > 0 ? (
              <ul className="space-y-1">
                {zone.nearby_stations.map((st, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-center gap-2">
                    <span className="text-blue-400">●</span> {st}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 italic">No nearby stations listed.</p>
            )}
          </div>

          <hr className="border-zinc-800" />

          {/* Geographic Data */}
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Geographic Data</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-xs block mb-1">Latitude</span>
                <span className="text-zinc-200 font-mono">{zone.center[0]}</span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-xs block mb-1">Longitude</span>
                <span className="text-zinc-200 font-mono">{zone.center[1]}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-zinc-800/50">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              NammaCity AI · Bengaluru City Intelligence Platform · Auto-Generated Report
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Score row sub-component */
function ScoreRow({ label, score }: { label: string; score: number }) {
  const color =
    score >= 8 ? "#ef4444" :
    score >= 6 ? "#f97316" :
    score >= 4 ? "#eab308" : "#22c55e";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-400 w-44 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${(score / 10) * 100}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold font-mono w-12 text-right" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}
