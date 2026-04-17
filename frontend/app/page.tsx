"use client";

import { useEffect, useState } from "react";
import DashboardHeader from "./components/DashboardHeader";
import MapView from "./components/MapView";
import TimeSlider from "./components/TimeSlider";
import ZonePanel from "./components/ZonePanel";
import { ZoneData, ZonesResponse, SingleZoneResponse } from "@/lib/types";

export default function Home() {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [summary, setSummary] = useState<ZonesResponse["summary"] | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZoneData, setSelectedZoneData] = useState<SingleZoneResponse | null>(null);
  
  const [timeOffset, setTimeOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSliderLoading, setIsSliderLoading] = useState(false);

  // Fetch all zones and summary
  const fetchScores = async (offset: number) => {
    try {
      const url = offset === 0 
        ? "http://localhost:8000/api/zones" 
        : `http://localhost:8000/api/forecast?offset=${offset}`;
        
      const res = await fetch(url);
      const data: ZonesResponse = await res.json();
      setZones(data.zones);
      setSummary(data.summary);
    } catch (err) {
      console.error("Failed to fetch zones:", err);
    }
  };

  // Fetch detailed zone data when selected
  const fetchZoneDetail = async (zoneId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/zones/${zoneId}`);
      const data: SingleZoneResponse = await res.json();
      setSelectedZoneData(data);
    } catch (err) {
      console.error("Failed to fetch zone detail:", err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchScores(0).finally(() => setIsLoading(false));
  }, []);

  // Handle time slider change
  useEffect(() => {
    if (isLoading) return;
    setIsSliderLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchScores(timeOffset).finally(() => setIsSliderLoading(false));
    }, 500); // 500ms debounce to avoid spamming the backend

    return () => clearTimeout(delayDebounceFn);
  }, [timeOffset]);

  // Handle zone selection
  useEffect(() => {
    if (selectedZoneId) {
      fetchZoneDetail(selectedZoneId);
    } else {
      setSelectedZoneData(null);
    }
  }, [selectedZoneId]);

  return (
    <main className="relative w-full h-screen bg-background overflow-hidden flex flex-col items-stretch">
      {/* 3D Map sits behind everything */}
      <div className="absolute inset-0 z-0">
        <MapView 
          zones={zones} 
          selectedZone={selectedZoneId}
          onSelectZone={setSelectedZoneId}
        />
      </div>

      {/* UI Elements overlaid on map */}
      <DashboardHeader summary={summary} />

      <TimeSlider 
        offset={timeOffset} 
        currentHour={summary?.current_hour || 0}
        isLoading={isSliderLoading}
        onOffsetChange={setTimeOffset}
      />

      {selectedZoneId && (
        <ZonePanel 
          zoneData={selectedZoneData} 
          onClose={() => setSelectedZoneId(null)} 
        />
      )}
    </main>
  );
}
