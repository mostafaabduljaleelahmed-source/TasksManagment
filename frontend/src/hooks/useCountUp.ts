import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 up to `value` once, using an ease-out curve.
 * Re-triggers whenever `value` changes (e.g. a fresh leaderboard fetch).
 */
export function useCountUp(value: number, durationMs = 900): number {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = value;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return display;
}
