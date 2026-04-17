"use client";

import { useState } from "react";
import { applyScenario, fetchZonesWithSummary } from "../lib/api";
import type { ZonesApiResponse } from "../lib/types";

type Props = {
    onScenariosApplied: (data: ZonesApiResponse) => void;
};

type Scenario = {
    id: string | null;
    label: string;
    icon: string;
    description: string;
    color: string;
};

const SCENARIOS: Scenario[] = [
    {
        id: null,
        label: "Normal",
        icon: "🌤️",
        description: "Baseline city conditions",
        color: "#22c55e",
    },
    {
        id: "ipl-match",
        label: "IPL Match at Chinnaswamy",
        icon: "🏏",
        description: "Heavy crowd & traffic near stadium",
        color: "#f97316",
    },
    {
        id: "monsoon-heavy",
        label: "Heavy Monsoon",
        icon: "🌧️",
        description: "Flooding risk, reduced road capacity",
        color: "#3b82f6",
    },
    {
        id: "orr-blocked",
        label: "ORR Blocked",
        icon: "🚧",
        description: "Outer Ring Road major disruption",
        color: "#ef4444",
    },
    {
        id: "metro-strike",
        label: "Metro Strike",
        icon: "🚇",
        description: "Metro services suspended",
        color: "#eab308",
    },
    {
        id: "school-holiday",
        label: "School Holiday",
        icon: "🎒",
        description: "Reduced peak-hour congestion",
        color: "#a78bfa",
    },
    {
        id: "rain-plus-ipl",
        label: "Rain + IPL Double Whammy",
        icon: "⛈️🏏",
        description: "Worst-case scenario for central Bengaluru",
        color: "#dc2626",
    },
];

export default function ScenarioDropdown({ onScenariosApplied }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
    const [loading, setLoading] = useState(false);

    const handleSelect = async (scenario: Scenario) => {
        if (loading) return;
        if (scenario.id === activeScenario.id) {
            setIsOpen(false);
            return;
        }
        setIsOpen(false);
        setActiveScenario(scenario);
        setLoading(true);
        try {
            await applyScenario(scenario.id);
            const data = await fetchZonesWithSummary();
            onScenariosApplied(data);
        } catch (e) {
            console.error("Failed to apply scenario:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: "relative", zIndex: 50 }}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen((o) => !o)}
                disabled={loading}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    background: "rgba(17, 24, 39, 0.85)",
                    border: "1px solid #1e293b",
                    borderRadius: "10px",
                    color: "#f1f5f9",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: loading ? "wait" : "pointer",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                    minWidth: "220px",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 0 16px rgba(59,130,246,0.25)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e293b";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 2px 12px rgba(0,0,0,0.4)";
                }}
            >
                <span style={{ fontSize: "16px" }}>{activeScenario.icon}</span>
                <span style={{ flex: 1, textAlign: "left" }}>
                    {loading ? "Applying…" : activeScenario.label}
                </span>
                {/* Loading spinner or chevron */}
                {loading ? (
                    <span
                        style={{
                            width: "14px",
                            height: "14px",
                            border: "2px solid #3b82f6",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            display: "inline-block",
                            animation: "spin 0.7s linear infinite",
                        }}
                    />
                ) : (
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                            color: "#64748b",
                        }}
                    >
                        <path
                            d="M2 4l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        minWidth: "260px",
                        background: "rgba(10, 14, 23, 0.97)",
                        border: "1px solid #1e293b",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        animation: "fadeSlideDown 0.15s ease",
                    }}
                >
                    <div
                        style={{
                            padding: "8px 12px",
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            color: "#475569",
                            textTransform: "uppercase",
                            borderBottom: "1px solid #1e293b",
                        }}
                    >
                        What-If Scenarios
                    </div>
                    {SCENARIOS.map((scenario) => {
                        const isActive = activeScenario.id === scenario.id;
                        return (
                            <button
                                key={scenario.id ?? "normal"}
                                onClick={() => handleSelect(scenario)}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 14px",
                                    background: isActive
                                        ? "rgba(59,130,246,0.08)"
                                        : "transparent",
                                    border: "none",
                                    borderLeft: isActive
                                        ? `3px solid ${scenario.color}`
                                        : "3px solid transparent",
                                    color: isActive ? "#f1f5f9" : "#94a3b8",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.background =
                                            "rgba(255,255,255,0.04)";
                                        (e.currentTarget as HTMLButtonElement).style.color =
                                            "#e2e8f0";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.background =
                                            "transparent";
                                        (e.currentTarget as HTMLButtonElement).style.color =
                                            "#94a3b8";
                                    }
                                }}
                            >
                                <span style={{ fontSize: "18px", lineHeight: 1 }}>
                                    {scenario.icon}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: "13px" }}>
                                        {scenario.label}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                                        {scenario.description}
                                    </div>
                                </div>
                                {isActive && (
                                    <span
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            background: scenario.color,
                                            boxShadow: `0 0 6px ${scenario.color}`,
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Inline keyframes via a style tag */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
