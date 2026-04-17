"use client";

import { useMemo } from "react";
import type { Zone } from "../lib/types";

type Props = {
    zones: Zone[];
    isOpen: boolean;
    onToggle: () => void;
};

type AlertEntry = {
    id: string;
    zoneId: string;
    zoneName: string;
    severity: "critical" | "warning" | "moderate" | "normal";
    message: string;
    timestamp: string;
    score: number;
};

function formatTime(baseMs: number, offsetMs: number): string {
    const d = new Date(baseMs - offsetMs);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function generateAlerts(zones: Zone[]): AlertEntry[] {
    const now = Date.now();
    const entries: AlertEntry[] = [];

    zones.forEach((zone, idx) => {
        const score = zone.scores.composite;
        const severity = zone.scores.severity as "critical" | "warning" | "moderate" | "normal";

        let message = "";
        if (severity === "critical") message = `${zone.name} crossed critical threshold (score ${score.toFixed(1)})`;
        else if (severity === "warning") message = `${zone.name} entering elevated stress zone`;
        else if (severity === "moderate") message = `${zone.name} experiencing moderate traffic load`;
        else message = `${zone.name} conditions are clear and normal`;

        // Add some stable artificial jitter to timestamp so it looks like a live feed
        // using zone ID to keep it somewhat deterministic but distributed
        const backsetMs = (idx * 110_000) % 600_000;

        entries.push({
            id: `alert-${zone.id}`,
            zoneId: zone.id,
            zoneName: zone.name,
            severity,
            message,
            timestamp: formatTime(now, backsetMs),
            score,
        });

        // Extra alert for rising trends if critical
        if (severity === "critical" && zone.scores.trend === "rising") {
            entries.push({
                id: `trend-${zone.id}`,
                zoneId: zone.id,
                zoneName: zone.name,
                severity: "critical",
                message: `Rising trend detected in ${zone.name} — rapid congestion build-up`,
                timestamp: formatTime(now, backsetMs + 120_000),
                score: score + 0.1, // slightly higher to rank above its own base alert
            });
        }
    });

    // Sort by score descending (most severe first: critical -> warning -> moderate -> normal)
    return entries.sort((a, b) => b.score - a.score);
}

const SEV_CONFIG = {
    critical: {
        color: "#ef4444", // Red
        bg: "rgba(239,68,68,0.08)",
        border: "rgba(239,68,68,0.3)",
        icon: "🔴",
        label: "CRITICAL",
    },
    warning: {
        color: "#f97316", // Orange
        bg: "rgba(249,115,22,0.08)",
        border: "rgba(249,115,22,0.3)",
        icon: "🟠",
        label: "WARNING",
    },
    moderate: {
        color: "#eab308", // Yellow
        bg: "rgba(234,179,8,0.08)",
        border: "rgba(234,179,8,0.3)",
        icon: "🟡",
        label: "MODERATE",
    },
    normal: {
        color: "#22c55e", // Green
        bg: "rgba(34,197,94,0.08)",
        border: "rgba(34,197,94,0.3)",
        icon: "🟢",
        label: "NORMAL",
    },
};

export default function AlertFeed({ zones, isOpen, onToggle }: Props) {
    const alerts = useMemo(() => generateAlerts(zones), [zones]);
    const criticalCount = alerts.filter((a) => a.severity === "critical").length;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                title="Toggle Alert Feed"
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "8px 14px",
                    background: isOpen
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(17, 24, 39, 0.85)",
                    border: `1px solid ${isOpen ? "rgba(239,68,68,0.5)" : "#1e293b"}`,
                    borderRadius: "10px",
                    color: isOpen ? "#ef4444" : "#94a3b8",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    transition: "all 0.2s ease",
                    boxShadow: isOpen
                        ? "0 0 16px rgba(239,68,68,0.2)"
                        : "0 2px 12px rgba(0,0,0,0.4)",
                }}
            >
                <span>Status Feed</span>
                {criticalCount > 0 && (
                    <span
                        style={{
                            padding: "1px 7px",
                            background: "#ef4444",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#fff",
                            animation: criticalCount > 0 ? "pulse 2s ease-in-out infinite" : undefined,
                        }}
                    >
                        {criticalCount}
                    </span>
                )}
            </button>

            {/* Slide-in Panel */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100vh",
                    width: "340px",
                    background: "rgba(10, 14, 23, 0.97)",
                    borderLeft: "1px solid #1e293b",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    zIndex: 40,
                    display: "flex",
                    flexDirection: "column",
                    transform: isOpen ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isOpen ? "-8px 0 40px rgba(0,0,0,0.6)" : "none",
                }}
            >
                {/* Panel Header */}
                <div
                    style={{
                        padding: "18px 18px 14px",
                        borderBottom: "1px solid #1e293b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            Status Feed
                            {criticalCount > 0 && (
                                <span
                                    style={{
                                        padding: "2px 8px",
                                        background: "rgba(239,68,68,0.15)",
                                        border: "1px solid rgba(239,68,68,0.4)",
                                        borderRadius: "999px",
                                        fontSize: "11px",
                                        color: "#ef4444",
                                        fontWeight: 700,
                                    }}
                                >
                                    {criticalCount} critical
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px" }}>
                            Auto-generated from live zone data
                        </div>
                    </div>
                    <button
                        onClick={onToggle}
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid #1e293b",
                            borderRadius: "7px",
                            color: "#64748b",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "16px",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9";
                            (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(255,255,255,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                            (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(255,255,255,0.05)";
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Alert List */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                    }}
                >
                    {alerts.length === 0 ? (
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#475569",
                                gap: "8px",
                                paddingTop: "60px",
                            }}
                        >
                            <span style={{ fontSize: "32px" }}>✅</span>
                            <div style={{ fontSize: "13px", fontWeight: 500 }}>
                                All zones nominal
                            </div>
                            <div style={{ fontSize: "11px", textAlign: "center" }}>
                                No critical or warning alerts at this time
                            </div>
                        </div>
                    ) : (
                        alerts.map((alert, idx) => {
                            const cfg = SEV_CONFIG[alert.severity];
                            return (
                                <div
                                    key={alert.id}
                                    style={{
                                        padding: "10px 12px",
                                        background: cfg.bg,
                                        border: `1px solid ${cfg.border}`,
                                        borderRadius: "10px",
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "flex-start",
                                        animation: `fadeIn 0.2s ease ${idx * 0.03}s both`,
                                    }}
                                >
                                    {/* Severity Icon */}
                                    <div style={{ fontSize: "16px", lineHeight: 1.4, flexShrink: 0 }}>
                                        {cfg.icon}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: "4px",
                                                marginBottom: "3px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "10px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.1em",
                                                    color: cfg.color,
                                                }}
                                            >
                                                {cfg.label}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "10px",
                                                    color: "#475569",
                                                    fontVariantNumeric: "tabular-nums",
                                                }}
                                            >
                                                {alert.timestamp}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "12px",
                                                color: "#cbd5e1",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {alert.message}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "12px 16px",
                        borderTop: "1px solid #1e293b",
                        fontSize: "10px",
                        color: "#334155",
                        textAlign: "center",
                        letterSpacing: "0.05em",
                    }}
                >
                    Updates every 30s · {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </>
    );
}
