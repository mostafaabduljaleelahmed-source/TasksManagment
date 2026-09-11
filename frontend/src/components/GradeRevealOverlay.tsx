import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';

interface GradeRevealOverlayProps {
  grade: number;
  maxGrade: number;
  onDone: () => void;
}

const COUNT_UP_MS = 1200;
const HOLD_MS = 3000;
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const GradeRevealOverlay: React.FC<GradeRevealOverlayProps> = ({ grade, maxGrade, onDone }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: number;
    let holdTimer: ReturnType<typeof setTimeout>;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * grade));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        holdTimer = setTimeout(onDone, HOLD_MS);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(holdTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  const pct = maxGrade > 0 ? Math.min(1, display / maxGrade) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-[#12160F] border border-[#212B1E] rounded-3xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
        <div className="relative w-40 h-40">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#212B1E" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              className="text-primary-500"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-white tabular-nums">{display}</span>
            <span className="text-xs text-sage-400 font-semibold">/ {maxGrade}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-primary-400">
          <Award className="w-4 h-4" />
          <p className="text-sm font-bold">Your Grade</p>
        </div>
      </div>
    </div>
  );
};
