"use client";

import { useCallback, useState } from "react";
import { useTimer, formatTime } from "@/hooks/useTimer";
import styles from "./TimerBar.module.css";

interface TimerBarProps {
  timerEndsAtMs: number | null;
  totalSeconds: number;
}

export function TimerBar({ timerEndsAtMs, totalSeconds }: TimerBarProps) {
  const [expired, setExpired] = useState(false);

  const onExpire = useCallback(() => setExpired(true), []);
  const remaining = useTimer(timerEndsAtMs, onExpire);

  // Reset expired state if timer restarts (new session)
  if (timerEndsAtMs != null && !expired && remaining > 0 && expired) {
    setExpired(false);
  }

  const isUrgent = remaining > 0 && remaining <= 60;
  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;

  if (timerEndsAtMs == null) return null;

  return (
    <>
      <div className={styles.wrap}>
        <span className={styles.label}>Time remaining</span>
        <span className={`${styles.clock} ${isUrgent ? styles.clockUrgent : ""}`}>
          {formatTime(remaining)}
        </span>
        <div className={styles.barTrack}>
          <div
            className={`${styles.barFill} ${isUrgent ? styles.barFillUrgent : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {expired && (
        <div className={styles.expiredBanner}>
          ⏰ Time&apos;s up! Admin can move to Review when ready.
        </div>
      )}
    </>
  );
}
