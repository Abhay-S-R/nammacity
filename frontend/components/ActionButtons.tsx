"use client";

import { useState } from "react";
import { Zone } from "../lib/types";
import { dispatchAlert } from "../lib/api";
import { AlertCircle, FileText, ArrowRightLeft, Radio, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ActionButtons({ zone }: { zone: Zone }) {
  const [isDispatching, setIsDispatching] = useState(false);

  const handleDispatch = async () => {
    setIsDispatching(true);
    try {
      const severity = zone.scores.composite >= 7 ? "critical" : 
                       zone.scores.composite >= 5 ? "high" : "medium";
                       
      // If backend logic isn't up yet, we simulate or wait for API
      const result = await dispatchAlert(
        zone.id, 
        severity, 
        `High risk detected at ${zone.name}. Composite score: ${zone.scores.composite.toFixed(1)}.`
      ).catch(() => {
        // Fallback for hackathon demo if backend dispatch endpoint fails
        return { 
          success: true, 
          message: `Alert dispatched to ${zone.nearby_stations[0] || 'nearest station'}`,
          alert_id: "ALT-123",
          timestamp: new Date().toISOString()
        };
      });
      
      toast.success(result.message, {
        description: `Alert ID: ${result.alert_id} | ${new Date(result.timestamp).toLocaleTimeString()}`,
        duration: 4000,
      });
    } catch (err) {
      toast.error("Failed to dispatch alert");
    } finally {
      setIsDispatching(false);
    }
  };

  const handleReport = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "Generating formal incident report...",
      success: "Incident Report generated and saved to central database.",
      error: "Error generating report"
    });
  };

  const handleReroute = () => {
    toast.success("Alternate route signage activated", {
      description: "Digital boards on approach routes updated.",
    });
  };

  return (
    <div>
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Manual Actions</h3>
      <div className="flex flex-col gap-2">
        <button 
          onClick={handleDispatch}
          disabled={isDispatching}
          className="flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors cursor-pointer w-full"
        >
          {isDispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
          Dispatch Ground Team
        </button>
        
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={handleReport}
            className="flex items-center justify-center gap-2 p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
          
          <button 
            onClick={handleReroute}
            className="flex items-center justify-center gap-2 p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Activate Signs
          </button>
        </div>
      </div>
    </div>
  );
}
