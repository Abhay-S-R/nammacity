"use client";

import { Megaphone, FileText, Navigation2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function ActionButtons({ zoneId, severity }: { zoneId: string, severity: string }) {
  const [isDispatching, setIsDispatching] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const handleDispatch = async () => {
    setIsDispatching(true);
    // Simulate backend call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsDispatching(false);
    toast.success(`Units dispatched to ${zoneId.replace("-", " ")}`, {
      description: "BTP stations in vicinity have been alerted.",
      className: "bg-card border-card-border text-foreground"
    });
  };

  const handleReport = async () => {
    setIsReporting(true);
    // Simulate backend agent call (Tier 2 feature)
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsReporting(false);
    toast("Report Generated", {
      description: "Formal incident report has been logged to the system.",
      className: "bg-card border-card-border text-foreground"
    });
  };

  const handleSignage = () => {
    toast("Signage Updated", {
      description: "Alternate route signage activated on major arterial roads.",
      className: "bg-card border-card-border text-foreground"
    });
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      <button 
        onClick={handleDispatch}
        disabled={isDispatching}
        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-70"
      >
        {isDispatching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
        Dispatch Units
      </button>

      <div className="flex gap-3">
        <button 
          onClick={handleReport}
          disabled={isReporting}
          className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition-colors text-sm font-medium"
        >
          {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Report
        </button>
        <button 
          onClick={handleSignage}
          className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition-colors text-sm font-medium"
        >
          <Navigation2 className="w-4 h-4" />
          Reroute
        </button>
      </div>
    </div>
  );
}
