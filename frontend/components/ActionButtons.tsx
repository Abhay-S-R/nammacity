"use client";

import { useState } from "react";
import { Zone } from "../lib/types";
import { dispatchAlert } from "../lib/api";
import { FileText, ArrowRightLeft, Radio, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import ReportModal from "./ReportModal";

type ActionButtonsProps = {
  zone: Zone;
  onReportIssue?: () => void;
};

export default function ActionButtons({ zone, onReportIssue }: ActionButtonsProps) {
  const [isDispatching, setIsDispatching] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const handleDispatch = async () => {
    setIsDispatching(true);
    try {
      const severity =
        zone.scores.composite >= 7
          ? "critical"
          : zone.scores.composite >= 5
          ? "warning"
          : "moderate";

      const result = await dispatchAlert(
        zone.id,
        severity,
        `High risk detected at ${zone.name}. Composite score: ${zone.scores.composite.toFixed(1)}.`
      );

      toast.success(result.message, {
        description: `Alert ID: ${result.alert.id} → ${result.alert.station_name} | ${new Date(result.alert.timestamp).toLocaleTimeString()}`,
        duration: 5000,
      });
    } catch (err) {
      console.error(err);
      toast.success(`Alert dispatched to ${zone.nearby_stations[0] || "nearest station"}`, {
        description: "Demo mode — backend may not be running",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleReroute = () => {
    toast.success("Alternate route signage activated", {
      description: "Digital boards on approach routes updated.",
    });
  };

  return (
    <div>
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
        Manual Actions
      </h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleDispatch}
          disabled={isDispatching}
          className="flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors cursor-pointer w-full"
        >
          {isDispatching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Radio className="w-4 h-4" />
          )}
          Dispatch Ground Team
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center justify-center gap-2 p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Gen. Report
          </button>

          <button
            onClick={handleReroute}
            className="flex items-center justify-center gap-2 p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Activate Signs
          </button>
        </div>

        {onReportIssue && (
          <button
            onClick={onReportIssue}
            className="flex items-center justify-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Flag className="w-4 h-4" />
            Report Citizen Issue
          </button>
        )}
      </div>

      {/* Comprehensive Incident Report Modal */}
      <ReportModal
        zone={zone}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  );
}
