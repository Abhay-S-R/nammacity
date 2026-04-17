"use client";

import { useState } from "react";
import Map from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { ColumnLayer, ScatterplotLayer } from "@deck.gl/layers";
import { ZoneData } from "@/lib/types";
import "maplibre-gl/dist/maplibre-gl.css";

// Define the MapTiler access token here. 
// User will replace this or put it in .env.local
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "YOUR_MAPTILER_KEY_HERE";
const MAP_STYLE = `https://api.maptiler.com/maps/basic-v2-dark/style.json?key=${MAPTILER_KEY}`;

// Initial viewpoint for Bengaluru
const INITIAL_VIEW_STATE = {
  longitude: 77.5946,
  latitude: 12.9716,
  zoom: 11,
  pitch: 45,
  bearing: 0,
};

interface MapViewProps {
  zones: ZoneData[];
  selectedZone: string | null;
  onSelectZone: (zoneId: string) => void;
}

export default function MapView({ zones, selectedZone, onSelectZone }: MapViewProps) {
  
  const getSeverityColor = (severity: string): [number, number, number, number] => {
    switch (severity) {
      case "critical": return [239, 68, 68, 200]; // red
      case "warning": return [249, 115, 22, 200]; // orange
      case "moderate": return [234, 179, 8, 200]; // yellow
      case "normal": return [34, 197, 94, 200]; // green
      default: return [100, 100, 100, 200];
    }
  };

  const layers = [
    // 3D Hexagon Column Layer
    new ColumnLayer<ZoneData>({
      id: "zone-columns",
      data: zones,
      diskResolution: 6, // Makes it a hexagon!
      radius: 1200, // 1.2km radius
      extruded: true,
      pickable: true,
      elevationScale: 500, // scale up the height
      getPosition: (d) => [d.center[1], d.center[0]], // [lng, lat]
      getFillColor: (d) => getSeverityColor(d.scores.severity),
      getElevation: (d) => d.scores.composite,
      onClick: ({ object }) => object && onSelectZone(object.id),
      updateTriggers: {
        getElevation: [zones], // re-render when scores change
        getFillColor: [zones]
      },
      transitions: {
        getElevation: 1000, // Smooth transition when time slider moves!
        getFillColor: 1000,
      }
    }),
    
    // Pulse/Outline for selected zone
    new ScatterplotLayer<ZoneData>({
      id: "zone-selection",
      data: zones.filter(z => z.id === selectedZone),
      pickable: false,
      stroked: true,
      filled: false,
      lineWidthMinPixels: 4,
      radiusScale: 1,
      getRadius: 1400,
      getPosition: (d) => [d.center[1], d.center[0]],
      getLineColor: [59, 130, 246, 255], // Accent Blue
      updateTriggers: {
        data: [selectedZone]
      }
    })
  ];

  return (
    <div className="absolute inset-0 w-full h-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getCursor={({ isDragging, isHovering }: { isDragging: boolean; isHovering: boolean }) => 
          isHovering ? "pointer" : isDragging ? "grabbing" : "grab"
        }
      >
        <Map
          mapStyle={MAP_STYLE}
          attributionControl={false}
        />
      </DeckGL>
    </div>
  );
}
