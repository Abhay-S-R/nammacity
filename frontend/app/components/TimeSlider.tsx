"use client";

import { Clock, Loader2 } from "lucide-react";

interface TimeSliderProps {
  offset: number;
  currentHour: number;
  isLoading: boolean;
  onOffsetChange: (val: number) => void;
}

export default function TimeSlider({ offset, currentHour, isLoading, onOffsetChange }: TimeSliderProps) {
  const forecastHour = (currentHour + offset) % 24;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/90 backdrop-blur-md border border-card-border p-4 rounded-full shadow-2xl z-10 flex items-center gap-4">
      <div className="bg-blue-500/20 p-2 rounded-full">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        ) : (
          <Clock className="w-5 h-5 text-accent" />
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between text-xs text-gray-400 font-mono font-medium px-1">
          <span>Now</span>
          <span>+2h</span>
          <span>+4h</span>
          <span>+6h</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="6" 
          step="1"
          value={offset}
          onChange={(e) => onOffsetChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
        />
      </div>

      <div className="text-right min-w-[70px]">
        <div className="text-sm font-bold">{forecastHour}:00</div>
        <div className="text-[10px] text-gray-400 uppercase">{offset === 0 ? "Current" : "Forecast"}</div>
      </div>
    </div>
  );
}
