"use client";

type LayerKey = "composite" | "congestion" | "pollution" | "infra_stress";

type Props = {
    activeLayer: LayerKey;
    onChange: (layer: LayerKey) => void;
};

type LayerOption = {
    key: LayerKey;
    label: string;
    icon: string;
    activeColor: string;
    activeGlow: string;
};

const LAYERS: LayerOption[] = [
    {
        key: "composite",
        label: "Composite",
        icon: "⚡",
        activeColor: "#3b82f6",
        activeGlow: "0 0 14px rgba(59,130,246,0.45)",
    },
    {
        key: "congestion",
        label: "Congestion",
        icon: "🚗",
        activeColor: "#f97316",
        activeGlow: "0 0 14px rgba(249,115,22,0.45)",
    },
    {
        key: "pollution",
        label: "Pollution",
        icon: "🏭",
        activeColor: "#a78bfa",
        activeGlow: "0 0 14px rgba(167,139,250,0.45)",
    },
    {
        key: "infra_stress",
        label: "Infrastructure",
        icon: "🏗️",
        activeColor: "#eab308",
        activeGlow: "0 0 14px rgba(234,179,8,0.45)",
    },
];

export default function LayerToggle({ activeLayer, onChange }: Props) {
    return (
        <div
            style={{
                position: "absolute",
                bottom: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                width: "100%",
                maxWidth: "672px", /* same as max-w-2xl = 672px */
                padding: "0 24px",   /* same as px-6 */
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
            }}
        >
            {/* Micro-label */}
            <p
                style={{
                    fontSize: "10px",
                    color: "#475569",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    margin: 0,
                    userSelect: "none" as const,
                }}
            >
                Map Layer
            </p>

            {/* Independent spaced pill buttons */}
            <div
                role="group"
                aria-label="Map layer selection"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                }}
            >
                {LAYERS.map((layer) => {
                    const isActive = activeLayer === layer.key;
                    return (
                        <button
                            key={layer.key}
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => onChange(layer.key)}
                            title={`View ${layer.label} layer`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                padding: "7px 16px",
                                borderRadius: "10px",
                                border: isActive
                                    ? `1px solid rgba(${hexToRgb(layer.activeColor)}, 0.4)`
                                    : "1px solid #1e293b",
                                background: isActive
                                    ? `rgba(${hexToRgb(layer.activeColor)}, 0.15)`
                                    : "rgba(10, 14, 23, 0.80)",
                                color: isActive ? layer.activeColor : "#64748b",
                                fontWeight: isActive ? 700 : 500,
                                fontSize: "12px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: isActive
                                    ? layer.activeGlow
                                    : "0 2px 8px rgba(0,0,0,0.3)",
                                backdropFilter: "blur(12px)",
                                WebkitBackdropFilter: "blur(12px)",
                                outline: "none",
                                whiteSpace: "nowrap" as const,
                                flex: "1",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                        "rgba(255,255,255,0.07)";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#334155";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(10,14,23,0.80)";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e293b";
                                }
                            }}
                        >
                            <span style={{ fontSize: "14px", lineHeight: 1 }}>{layer.icon}</span>
                            <span>{layer.label}</span>
                            {isActive && (
                                <span
                                    style={{
                                        display: "inline-block",
                                        width: "5px",
                                        height: "5px",
                                        borderRadius: "50%",
                                        background: layer.activeColor,
                                        boxShadow: `0 0 5px ${layer.activeColor}`,
                                        marginLeft: "2px",
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Utility: convert hex to "r, g, b" string for rgba()
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "255, 255, 255";
    return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
    ].join(", ");
}
