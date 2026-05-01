import { useEffect, useState } from "react";

// Compact relative-time label (e.g. "Now", "5m", "3h", "2d"). Schedules a
// re-render at the next minute boundary derived from `timestampMs`, so the
// label flips precisely when its value changes (e.g. "5m" → "6m") rather
// than up to ~60s late. Each tick reschedules from `Date.now()`, so
// backgrounded tabs self-correct on resume. A future `timestampMs` (e.g.
// when the client clock lags behind the timestamp source) is clamped to
// "Now".
export function RelativeTime({ timestampMs }: { timestampMs: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const elapsedMs = Math.max(0, Date.now() - timestampMs);
      const msUntilNextMinute = 60_000 - (elapsedMs % 60_000);
      timeoutId = setTimeout(() => {
        setTick((t) => t + 1);
        schedule();
      }, msUntilNextMinute);
    };

    schedule();
    return () => {
      clearTimeout(timeoutId);
    };
  }, [timestampMs]);

  return <>{formatRelative(timestampMs)}</>;
}

function formatRelative(timestampMs: number): string {
  const diffMs = Math.max(0, Date.now() - timestampMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
