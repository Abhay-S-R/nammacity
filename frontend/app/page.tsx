"use client";

import { useState, useEffect } from "react";
import MapView from "../components/MapView";
import DashboardHeader from "../components/DashboardHeader";
import TimeSlider from "../components/TimeSlider";
import ZonePanel from "../components/ZonePanel";
import { fetchZones, fetchForecast } from "../lib/api";
import { Zone, CityStats, computeCityStats } from "../lib/types";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stats, setStats] = useState<CityStats | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchZones();
        setZones(data);
        setStats(computeCityStats(data));
      } catch (err) {
        console.error("Failed to fetch initial zones:", err);
        // Add sample zone data if API fails to load locally to keep UI working
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Update on slider change
  useEffect(() => {
    if (timeOffset === 0) {
      // Reload current
      fetchZones().then(data => {
        setZones(data);
        setStats(computeCityStats(data));
        if (selectedZone) {
          const updated = data.find(z => z.id === selectedZone.id);
          if (updated) setSelectedZone(updated);
        }
      }).catch(console.error);
    } else {
      // Fetch forecast
      fetchForecast(timeOffset).then(res => {
        setZones(res.zones);
        setStats(computeCityStats(res.zones));
        if (selectedZone) {
          const updated = res.zones.find(z => z.id === selectedZone.id);
          if (updated) setSelectedZone(updated);
        }
      }).catch(console.error);
    }
  }, [timeOffset]);

  return (
    <main className="relative w-full h-full bg-zinc-950 overflow-hidden font-sans text-zinc-100 flex-1">
      {/* Background Dark gradient overlay if map isn't completely opaque */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/60 to-black/90 pointer-events-none z-0" />
      
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <h2 className="text-xl font-bold tracking-widest text-zinc-300 uppercase">Initializing City Grid</h2>
          </div>
        </div>
      ) : (
        <>
          <DashboardHeader stats={stats} />
          
          <MapView 
            zones={zones} 
            selectedZoneId={selectedZone?.id}
            onZoneClick={setSelectedZone} 
          />
          
          <TimeSlider 
            offset={timeOffset} 
            onChange={setTimeOffset} 
          />

          {selectedZone && (
            <ZonePanel 
              zone={selectedZone} 
              onClose={() => setSelectedZone(null)} 
            />
          )}

          <Toaster theme="dark" position="top-right" />
        </>
      )}
    </main>
  );
}
