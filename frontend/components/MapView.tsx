"use client";

import { useMemo, useCallback } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import DeckGL from "@deck.gl/react";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
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

  // Helper: find the nearest zone to a clicked [lng, lat] coordinate
  const findNearestZone = useCallback(
    (lng: number, lat: number): Zone | null => {
      if (!zones.length) return null;
      let nearest: Zone | null = null;
      let minDist = Infinity;
      for (const z of zones) {
        // zone.center is [lat, lng], click gives [lng, lat]
        const dlat = z.center[0] - lat;
        const dlng = z.center[1] - lng;
        const dist = dlat * dlat + dlng * dlng;
        if (dist < minDist) {
          minDist = dist;
          nearest = z;
        }
      }
      // Only match if within ~3km radius (~0.03 degrees)
      if (minDist > 0.03 * 0.03) return null;
      return nearest;
    },
    [zones]
  );

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
      gpuAggregation: false, // CRITICAL: CPU mode so points are available on click
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
        if (info.object) {
          // CPU aggregation mode: info.object.points is an array of { source, index }
          const points = info.object.points;
          if (points && points.length > 0) {
            const firstPoint = points[0];
            // Try .source (deck.gl CPU aggregation standard), then direct access
            const hexPoint: HexPoint | undefined =
              (firstPoint as any).source ?? (firstPoint as any);
            if (hexPoint && hexPoint.zone) {
              onZoneClick(hexPoint.zone);
              return true;
            }
          }

          // Fallback: use the click coordinate to find nearest zone
          if (info.coordinate) {
            const nearest = findNearestZone(info.coordinate[0], info.coordinate[1]);
            if (nearest) {
              onZoneClick(nearest);
              return true;
            }
          }
        }
        return true;
      },
    }),

    // Zone center markers (clickable, clearly visible)
    new ScatterplotLayer<Zone>({
      id: "zone-markers-layer",
      data: zones,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      lineWidthMinPixels: 2,
      getPosition: (d) => [d.center[1], d.center[0]],
      getFillColor: (d) =>
        d.id === selectedZoneId
          ? [59, 130, 246, 220]   // Blue highlight
          : [255, 255, 255, 60],  // Subtle white dot
      getLineColor: (d) =>
        d.id === selectedZoneId
          ? [147, 197, 253, 255]  // Bright blue ring
          : [148, 163, 184, 100], // Visible slate ring
      getRadius: (d) =>
        d.id === selectedZoneId ? 500 : 350,
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

    // Zone name labels
    new TextLayer<Zone>({
      id: "zone-labels-layer",
      data: zones,
      pickable: true,
      getPosition: (d) => [d.center[1], d.center[0]],
      getText: (d) => d.name,
      getSize: 13,
      getColor: [220, 220, 230, 200],
      getTextAnchor: "middle" as const,
      getAlignmentBaseline: "top" as const,
      getPixelOffset: [0, 14],
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: 600,
      outlineWidth: 3,
      outlineColor: [10, 14, 23, 220],
      billboard: true,
      sizeUnits: "pixels" as const,
      onClick: (info) => {
        if (info.object) {
          onZoneClick(info.object);
        }
        return true;
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
            radiusScale: 1,
            radiusMinPixels: 12,
            radiusMaxPixels: 28,
            lineWidthMinPixels: 2,
            getPosition: (d) => [d.center[1], d.center[0]],
            getLineColor: [59, 130, 246, 120],
            getRadius: 700,
          }),
        ]
      : []),
  ];

  // Fallback: clicking anywhere on the deck (map background) tries to find nearest zone
  const handleDeckClick = useCallback(
    (info: any) => {
      // Only fires if no layer handled the click
      if (!info.layer && info.coordinate) {
        const nearest = findNearestZone(info.coordinate[0], info.coordinate[1]);
        if (nearest) {
          onZoneClick(nearest);
        }
      }
    },
    [findNearestZone, onZoneClick]
  );

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
        onClick={handleDeckClick}
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
