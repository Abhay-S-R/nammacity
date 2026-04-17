"use client";

import { Clock, Play, Pause, Zap } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

type TimeSliderProps = {
  offset: number;
  onChange: (offset: number) => void;
  maxHours?: number;
};

export default function TimeSlider({ offset, onChange, maxHours = 6 }: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        onChange((offset + 1) > maxHours ? 0 : offset + 1);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, offset, maxHours, onChange]);

  // Format current time + offset
  const timeStr = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() + offset);
    return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }, [offset]);

  const isFuture = offset > 0;
  const fillPercent = (offset / maxHours) * 100;

  // Generate hour labels with actual times
  const hourLabels = useMemo(() => {
    const now = new Date();
    return [...Array(maxHours + 1)].map((_, i) => {
      if (i === 0) return "NOW";
      const d = new Date(now);
      d.setHours(d.getHours() + i);
      return d.toLocaleTimeString("en-US", { hour: "numeric" });
    });
  }, [maxHours]);

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-6 animate-fade-in-up">
      <div className={`glass-card p-5 transition-all duration-500 ${isFuture ? "glow-blue" : ""}`}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-all duration-300 ${isFuture
              ? "bg-blue-500/15 text-blue-400 shadow-lg shadow-blue-500/10"
              : "bg-slate-800/80 text-slate-400"
              }`}>
              {isFuture ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.12em]">
                {isFuture ? `Forecast · +${offset}h` : "Live Conditions"}
              </p>
              <p className={`text-xl font-bold score-number leading-tight transition-colors duration-300 ${isFuture ? "text-blue-300" : "text-slate-100"
                }`}>
                {timeStr}
              </p>
            </div>
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
              ${isPlaying
                ? "bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20 hover:bg-blue-500/30"
                : "bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 hover:text-slate-300"
              }`}
            aria-label={isPlaying ? "Pause forecast" : "Play forecast"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
        </div>

        {/* Slider Track */}
        <div className="relative pt-1 pb-1">
          {/* Step dots behind slider */}
          <div className="absolute top-[9px] left-0 right-0 flex justify-between px-[2px] pointer-events-none">
            {[...Array(maxHours + 1)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= offset
                  ? "bg-blue-400/70 shadow-sm shadow-blue-500/30"
                  : "bg-slate-700/60"
                  }`}
              />
            ))}
          </div>

          <input
            type="range"
            min="0"
            max={maxHours}
            step="1"
            value={offset}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="slider-custom relative z-10"
            style={{ "--slider-fill": `${fillPercent}%` } as React.CSSProperties}
          />

          {/* Labels */}
          <div className="flex justify-between mt-2.5 px-[2px]">
            {hourLabels.map((label, i) => (
              <span
                key={i}
                className={`text-[10px] font-mono font-medium transition-all duration-300 ${i === offset
                  ? "text-blue-400 scale-110"
                  : i < offset
                    ? "text-slate-500"
                    : "text-slate-600"
                  }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
