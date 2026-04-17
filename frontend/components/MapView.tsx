"use client";

import { useMemo, useCallback } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, TextLayer, ColumnLayer } from "@deck.gl/layers";
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

export default function MapView({
  zones,
  onZoneClick,
  selectedZoneId,
  activeLayer = "composite",
}: MapViewProps) {
  type SeverityBar = {
    elevationWeight: number;
    colorWeight: number;
    color: [number, number, number, number];
  };

  const getPriorityBarsFromScore = (finalScore: number): SeverityBar[] => {
    // One color per region, based on score band:
    // <=3: 1 green rod | >3 and <=5.5: 2 yellow rods | >5.5 and <=7.5: 3 orange rods | >7.5: 4 red rods.
    // Category height order is always preserved: red > orange > yellow > green.
    if (finalScore > 7.5) {
      return [
        { elevationWeight: 1160, colorWeight: 9.0, color: [239, 68, 68, 245] },
        { elevationWeight: 1020, colorWeight: 9.0, color: [239, 68, 68, 245] },
        { elevationWeight: 890, colorWeight: 9.0, color: [239, 68, 68, 245] },
        { elevationWeight: 770, colorWeight: 9.0, color: [239, 68, 68, 245] },
      ];
    }
    if (finalScore > 5.5) {
      return [
        { elevationWeight: 760, colorWeight: 7.0, color: [249, 115, 22, 240] },
        { elevationWeight: 670, colorWeight: 7.0, color: [249, 115, 22, 240] },
        { elevationWeight: 590, colorWeight: 7.0, color: [249, 115, 22, 240] },
      ];
    }
    if (finalScore > 3) {
      return [
        { elevationWeight: 470, colorWeight: 5.0, color: [234, 179, 8, 230] },
        { elevationWeight: 390, colorWeight: 5.0, color: [234, 179, 8, 230] },
      ];
    }
    return [{ elevationWeight: 220, colorWeight: 2.0, color: [34, 197, 94, 220] }];
  };

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
        0,
        (zone.scores[activeLayer as keyof typeof zone.scores] as number) || 0
      );
      const bars = getPriorityBarsFromScore(score);

      // Strictly capped at 4 bars per junction.
      bars.forEach((bar, i) => {
        // Deterministic seed from zone index + point index
        const seed = zoneIdx * 100 + i;
        const angle = seededRandom(seed) * Math.PI * 2;
        const distance = i * 0.0022;
        const z0 = Math.cos(angle) * distance;
        const z1 = Math.sin(angle) * distance;
        points.push({
          position: [zone.center[1] + z0, zone.center[0] + z1],
          weight: bar.elevationWeight,
          colorWeight: bar.colorWeight,
          color: bar.color,
          zone: zone,
        });
      });
    });
    return points;
  }, [zones, activeLayer]);

  const layers = [
    // Explicit 3D bar layer (stable heights, no aggregation collapse)
    new ColumnLayer<HexPoint>({
      id: "zone-bars-layer",
      data: hexData,
      pickable: true,
      extruded: true,
      radius: 240,
      diskResolution: 6, // hexagonal prism
      elevationScale: 3,
      getPosition: (d) => d.position,
      getElevation: (d) => d.weight,
      getFillColor: (d) => d.color,
      coverage: 0.8,
      opacity: 0.9,
      transitions: {
        elevationScale: 800,
        getElevation: 600,
      },
      onClick: (info) => {
        if (info.object) {
          const barPoint = info.object as HexPoint;
          if (barPoint.zone) {
            onZoneClick(barPoint.zone);
            return true;
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
          attributionControl={false}
        />
      </DeckGL>

      {/* Vignette overlay — darkens map edges for UI contrast */}
      <div className="absolute inset-0 map-vignette z-[1]" />
    </div>
  );
}
