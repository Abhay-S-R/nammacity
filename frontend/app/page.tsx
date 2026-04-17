"use client";

import { useState, useEffect, useCallback } from "react";
import MapView from "../components/MapView";
import DashboardHeader from "../components/DashboardHeader";
import TimeSlider from "../components/TimeSlider";
import ZonePanel from "../components/ZonePanel";
import ReportForm from "../components/ReportForm";
import { fetchZonesWithSummary, fetchForecast, applyScenario } from "../lib/api";
import { Zone, CityStats, statsFromSummary, ZonesApiResponse } from "../lib/types";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

// ─── Dev B components (uncomment after Dev B pushes) ────────────────────────
import ScenarioDropdown from "../components/ScenarioDropdown";
import AlertFeed from "../components/AlertFeed";
import LayerToggle from "../components/LayerToggle";

export default function Home() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stats, setStats] = useState<CityStats | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // ── Tier 2 state (ready for Dev B components) ──
  const [activeLayer, setActiveLayer] = useState<
    "composite" | "congestion" | "pollution" | "infra_stress"
  >("composite");
  const [showReportForm, setShowReportForm] = useState(false);
  const [showAlertFeed, setShowAlertFeed] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadCurrentData = useCallback(async () => {
    try {
      const data = await fetchZonesWithSummary();
      setZones(data.zones);
      setStats(statsFromSummary(data.summary));
    } catch (err) {
      console.error("Failed to fetch zones:", err);
    }
  }, []);

  // Initial load — also reset any lingering scenario from a previous session
  useEffect(() => {
    const init = async () => {
      await applyScenario(null); // ensure backend starts in Normal mode
      await loadCurrentData();
    };
    init().finally(() => setLoading(false));
  }, [loadCurrentData]);

  // Refresh on slider change
  useEffect(() => {
    if (loading) return; // skip during initial load

    const updateData = async () => {
      try {
        if (timeOffset === 0) {
          await loadCurrentData();
        } else {
          const res = await fetchForecast(timeOffset);
          setZones(res.zones);
          // Use the forecast summary
          setStats({
            criticalZones: res.summary.critical_zones,
            warningZones: res.summary.warning_zones,
            activeAlerts: res.summary.active_alerts,
            cityStress: res.summary.city_stress,
            avgComposite: res.summary.avg_composite,
          });
        }
      } catch (err) {
        console.error("Failed to update data:", err);
      }
    };

    updateData();
  }, [timeOffset, loadCurrentData, loading]);

  // Keep selected zone in sync when zones update
  useEffect(() => {
    if (selectedZone) {
      const updated = zones.find((z) => z.id === selectedZone.id);
      if (updated) setSelectedZone(updated);
    }
  }, [zones]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleZoneClick = (zone: Zone) => {
    setSelectedZone(zone);
  };

  const handleReportIssue = () => {
    setShowReportForm(true);
  };

  // Called by ScenarioDropdown after scenario is applied
  const handleScenariosApplied = (data: ZonesApiResponse) => {
    setZones(data.zones);
    setStats(statsFromSummary(data.summary));
    // Keep selected zone fresh
    if (selectedZone) {
      const updated = data.zones.find((z) => z.id === selectedZone.id);
      if (updated) setSelectedZone(updated);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="relative w-full h-full bg-zinc-950 overflow-hidden font-sans text-zinc-100 flex-1">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/60 to-black/90 pointer-events-none z-0" />

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <h2 className="text-xl font-bold tracking-widest text-zinc-300 uppercase">
              Initializing City Grid
            </h2>
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard Header — summary cards */}
          <DashboardHeader stats={stats} />

          {/* 3D Map */}
          <MapView
            zones={zones}
            selectedZoneId={selectedZone?.id}
            onZoneClick={handleZoneClick}
            activeLayer={activeLayer}
          />

          {/* Layer Toggle */}
          <LayerToggle activeLayer={activeLayer} onChange={setActiveLayer} />

          {/* Scenario Dropdown */}
          <ScenarioDropdown onScenariosApplied={handleScenariosApplied} />

          {/* Time Slider */}
          <TimeSlider offset={timeOffset} onChange={setTimeOffset} />

          {/* Zone Detail Panel */}
          {selectedZone && (
            <ZonePanel
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
              onReportIssue={handleReportIssue}
            />
          )}

          {/* Alert Feed */}
          <AlertFeed
            zones={zones}
            isOpen={showAlertFeed}
            onToggle={() => setShowAlertFeed(!showAlertFeed)}
          />

          {/* Citizen Report Form */}
          <ReportForm
            zones={zones}
            isOpen={showReportForm}
            onClose={() => setShowReportForm(false)}
            preselectedZoneId={selectedZone?.id}
          />

          <Toaster theme="dark" position="top-right" richColors />
        </>
      )}
    </main>
  );
}
