"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts down to a fixed epoch-ms deadline.
 * Returns remaining seconds (floored). Calls onExpire once when it hits 0.
 */
export function useTimer(
  timerEndsAtMs: number | null,
  onExpire?: () => void
): number {
  const [remaining, setRemaining] = useState<number>(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (timerEndsAtMs == null) {
      setRemaining(0);
      expiredRef.current = false;
      return;
    }

    expiredRef.current = false;

    function tick() {
      const rem = Math.max(0, Math.floor((timerEndsAtMs! - Date.now()) / 1000));
      setRemaining(rem);
      if (rem === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }

    tick(); // run immediately
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerEndsAtMs, onExpire]);

  return remaining;
}

/** Format seconds as M:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
