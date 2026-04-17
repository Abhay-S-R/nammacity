"use client";

import { useState } from "react";
import { Zone, ReportCategory } from "../lib/types";
import { submitReport } from "../lib/api";
import { X, AlertCircle, MapPin, FileText, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type ReportFormProps = {
  zones: Zone[];
  isOpen: boolean;
  onClose: () => void;
  preselectedZoneId?: string;
};

const CATEGORIES: { value: ReportCategory; label: string; icon: string }[] = [
  { value: "pothole", label: "Pothole / Road Damage", icon: "🕳️" },
  { value: "signal", label: "Signal Malfunction", icon: "🚦" },
  { value: "flooding", label: "Waterlogging / Flooding", icon: "🌊" },
  { value: "blocked-road", label: "Blocked Road", icon: "🚧" },
  { value: "other", label: "Other Issue", icon: "📋" },
];

export default function ReportForm({ zones, isOpen, onClose, preselectedZoneId }: ReportFormProps) {
  const [category, setCategory] = useState<ReportCategory>("pothole");
  const [zoneId, setZoneId] = useState(preselectedZoneId || (zones[0]?.id ?? ""));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const selectedZone = zones.find((z) => z.id === zoneId);

  const handleSubmit = async () => {
    if (!zoneId) return;
    setSubmitting(true);
    try {
      const location: [number, number] = selectedZone
        ? [selectedZone.center[0], selectedZone.center[1]]
        : [12.9716, 77.5946]; // default Bengaluru center

      const result = await submitReport({
        category,
        location,
        zone_id: zoneId,
        description: description || undefined,
      });

      setSubmitted(true);
      toast.success(`Report submitted for ${selectedZone?.name || zoneId}`, {
        description: `Report ID: ${result.report.id} • Total reports: ${result.total_reports}`,
      });

      // Reset after a moment
      setTimeout(() => {
        setSubmitted(false);
        setDescription("");
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit report. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Report an Issue</h2>
              <p className="text-xs text-zinc-500">Help improve Bengaluru's infrastructure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Report Submitted!</h3>
            <p className="text-sm text-zinc-400 text-center">
              Your report has been logged and will be reviewed by city authorities.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Category Selection */}
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                Issue Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                      category === cat.value
                        ? "border-blue-500 bg-blue-500/10 text-blue-300"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Zone Selector */}
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location / Zone
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue briefly..."
                rows={3}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !zoneId}
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-semibold transition-colors cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
