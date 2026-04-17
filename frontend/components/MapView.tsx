"use client";

import { useMemo } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import DeckGL from "@deck.gl/react";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { Zone, HexPoint } from "../lib/types";

// Free dark basemap — no API key needed
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const mapStyle = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
  : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type MapViewProps = {
  zones: Zone[];
  onZoneClick: (zone: Zone) => void;
  selectedZoneId?: string | null;
  activeLayer?: "composite" | "congestion" | "pollution" | "infra_stress";
};

// Refined color ramp: deep green → amber → hot orange → vivid red
const SEVERITY_COLOR_RANGE: [number, number, number, number][] = [
  [16, 185, 129, 220],   // Emerald — normal
  [34, 197, 94, 220],    // Green — low
  [234, 179, 8, 230],    // Amber — moderate
  [251, 146, 60, 240],   // Orange — elevated
  [239, 68, 68, 245],    // Red — high
  [220, 38, 38, 255],    // Deep red — critical
];

export default function MapView({
  zones,
  onZoneClick,
  selectedZoneId,
  activeLayer = "composite",
}: MapViewProps) {

  // Seeded pseudo-random for deterministic scatter (same zone = same points every render)
  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  // Generate hexagon data points from zone scores
  const hexData = useMemo(() => {
    const points: HexPoint[] = [];
    zones.forEach((zone, zoneIdx) => {
      const score = Math.max(
        0.5,
        (zone.scores[activeLayer as keyof typeof zone.scores] as number) || 0
      );

      // Green/normal zones (score < 3.5) get 0 height — they should be flat
      // Only moderate+ zones get elevation
      const elevationWeight = score < 3.5 ? 0 : score;

      // Fixed point count per zone — score drives weight, not density
      const count = 5;
      for (let i = 0; i < count; i++) {
        // Deterministic seed from zone index + point index
        const seed = zoneIdx * 100 + i;
        const u1 = Math.max(0.001, seededRandom(seed));
        const u2 = seededRandom(seed + 50);
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

        // Spread radius ~1-2km around zone center
        const spread = 0.01;
        points.push({
          position: [zone.center[1] + z0 * spread, zone.center[0] + z1 * spread],
          weight: elevationWeight,
          zone: zone,
        });
      }
    });
    return points;
  }, [zones, activeLayer]);

  const layers = [
    // 3D Hexagon heatmap layer
    new HexagonLayer<HexPoint>({
      id: "heatmap-layer",
      data: hexData,
      pickable: true,
      extruded: true,
      radius: 600,
      elevationScale: 6,
      getPosition: (d) => d.position,
      getElevationWeight: (d) => d.weight,
      elevationAggregation: "MEAN",
      getColorWeight: (d) => d.weight,
      colorAggregation: "MEAN",
      colorRange: SEVERITY_COLOR_RANGE,
      coverage: 0.8,
      opacity: 0.85,
      upperPercentile: 95,
      transitions: {
        elevationScale: 800,
        getColorWeight: 600,
      },
      onClick: (info) => {
        if (info.object && info.object.points && info.object.points.length > 0) {
          const point = info.object.points[0].source as HexPoint;
          if (point && point.zone) {
            onZoneClick(point.zone);
          }
        }
        return true;
      },
    }),

    // Zone center markers (clickable, subtle)
    new ScatterplotLayer<Zone>({
      id: "zone-markers-layer",
      data: zones,
      pickable: true,
      opacity: 0.85,
      stroked: true,
      filled: true,
      radiusScale: 120,
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      lineWidthMinPixels: 1,
      getPosition: (d) => [d.center[1], d.center[0]],
      getFillColor: (d) =>
        d.id === selectedZoneId
          ? [59, 130, 246, 200]   // Blue highlight
          : [255, 255, 255, 0],   // Invisible fill
      getLineColor: (d) =>
        d.id === selectedZoneId
          ? [147, 197, 253, 255]  // Bright blue ring
          : [148, 163, 184, 40],  // Very faint slate
      getRadius: (d) =>
        d.id === selectedZoneId ? 8 : 5,
      onClick: (info) => {
        if (info.object) {
          onZoneClick(info.object);
        }
        return true;
      },
      transitions: {
        getFillColor: 400,
        getLineColor: 400,
        getRadius: 400,
      },
    }),

    // Pulsing outer ring for selected zone
    ...(selectedZoneId
      ? [
          new ScatterplotLayer<Zone>({
            id: "zone-pulse-ring",
            data: zones.filter((z) => z.id === selectedZoneId),
            pickable: false,
            opacity: 0.4,
            stroked: true,
            filled: false,
            radiusScale: 200,
            radiusMinPixels: 8,
            radiusMaxPixels: 20,
            lineWidthMinPixels: 2,
            getPosition: (d) => [d.center[1], d.center[0]],
            getLineColor: [59, 130, 246, 120],
            getRadius: 10,
          }),
        ]
      : []),
  ];

  return (
    <div className="absolute inset-0 z-0">
      <DeckGL
        initialViewState={{
          longitude: 77.5946,
          latitude: 12.9716,
          zoom: 11,
          pitch: 50,
          bearing: -10,
        }}
        controller={true}
        layers={layers}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? "grabbing" : isHovering ? "pointer" : "crosshair"
        }
      >
        <Map
          mapLib={maplibregl as any}
          mapStyle={mapStyle}
        >
          <NavigationControl position="bottom-right" />
        </Map>
      </DeckGL>

      {/* Vignette overlay — darkens map edges for UI contrast */}
      <div className="absolute inset-0 map-vignette z-[1]" />
    </div>
  );
}
