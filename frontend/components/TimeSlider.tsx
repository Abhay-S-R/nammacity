"use client";

import { Clock, Play, Pause } from "lucide-react";
import { useState, useEffect } from "react";

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
  const now = new Date();
  now.setHours(now.getHours() + offset);
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isFuture = offset > 0;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-6">
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-5 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isFuture ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-300'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                {isFuture ? `Forecast: +${offset} Hours` : "Live Conditions"}
              </p>
              <p className="text-lg font-bold text-zinc-100">{timeStr}</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
          </button>
        </div>
        
        <div className="relative pt-2 pb-1">
          <input
            type="range"
            min="0"
            max={maxHours}
            step="1"
            value={offset}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between mt-2 px-1">
            {[...Array(maxHours + 1)].map((_, i) => (
              <span key={i} className="text-xs text-zinc-500 font-mono">
                {i === 0 ? "Now" : `+${i}h`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
