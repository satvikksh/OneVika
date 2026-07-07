"use client";

import { useEffect, useRef, useState } from "react";

export function formatCallDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Tracks elapsed call time. The timer starts counting from the moment `active`
 * becomes true and resets when it becomes false.
 */
export function useCallTimer(active: boolean): {
  seconds: number;
  formatted: string;
} {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startRef.current = null;
      return;
    }

    startRef.current = Date.now();

    const tick = () => {
      if (startRef.current != null) {
        setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
      }
    };

    // Async initial tick (setState in effect body is intentionally avoided).
    const timeout = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 250);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [active]);

  const display = active ? seconds : 0;
  return { seconds: display, formatted: formatCallDuration(display) };
}
