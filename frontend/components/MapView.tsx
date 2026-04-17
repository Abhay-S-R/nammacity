"use client";

import { useMemo } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import DeckGL from "@deck.gl/react";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { Zone, HexPoint } from "../lib/types";

// Using a free map style if MapTiler isn't provided (for the hackathon demo)
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const mapStyle = process.env.NEXT_PUBLIC_MAPTILER_KEY 
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
  activeLayer = "composite" 
}: MapViewProps) {
  
  // Generate hexagon points from zones based on scores to create a hotspot effect
  const hexData = useMemo(() => {
    const points: HexPoint[] = [];
    zones.forEach((zone) => {
      const score = Math.max(1, zone.scores[activeLayer as keyof typeof zone.scores] as number || 0);
      
      // We generate points proportionally to the score to create a 3D mound
      const count = 3 + Math.floor(score * 2); 
      for (let i = 0; i < count; i++) {
        // Apply slight Gaussian-like jitter around the zone center to create a blob
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
        
        // Spread radius roughly 0.01-0.02 degrees (~1-2km)
        const spread = 0.015;
        points.push({
          position: [zone.center[1] + z0 * spread, zone.center[0] + z1 * spread],
          weight: score,
          zone: zone,
        });
      }
    });
    return points;
  }, [zones, activeLayer]);

  const layers = [
    new HexagonLayer<HexPoint>({
      id: "heatmap-layer",
      data: hexData,
      pickable: true,
      extruded: true,
      radius: 400, // meters
      elevationScale: 100,
      getPosition: (d) => d.position,
      getElevationWeight: (d) => d.weight,
      elevationAggregation: "MEAN",
      getColorWeight: (d) => d.weight,
      colorAggregation: "MEAN",
      colorRange: [
        [34, 197, 94, 255],   // Green
        [234, 179, 8, 255],   // Yellow
        [249, 115, 22, 255],  // Orange
        [239, 68, 68, 255],   // Red
      ],
      transitions: {
        elevationScale: 1000,
        getColorWeight: 1000,
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
    
    // Labels & markers for the zones (transparent but highly pickable)
    new ScatterplotLayer<Zone>({
      id: "zone-markers-layer",
      data: zones,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 150,
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      lineWidthMinPixels: 1,
      getPosition: (d) => [d.center[1], d.center[0]],
      getFillColor: (d) => (d.id === selectedZoneId ? [59, 130, 246, 255] : [255, 255, 255, 0]),
      getLineColor: (d) => (d.id === selectedZoneId ? [255, 255, 255, 255] : [255, 255, 255, 50]),
      onClick: (info) => {
        if (info.object) {
          onZoneClick(info.object);
        }
        return true;
      },
    }),
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
        getCursor={({ isDragging }) => (isDragging ? "grabbing" : "crosshair")}
      >
        <Map
          mapLib={maplibregl as any}
          mapStyle={mapStyle}
        >
          <NavigationControl position="bottom-right" />
        </Map>
      </DeckGL>
    </div>
  );
}
