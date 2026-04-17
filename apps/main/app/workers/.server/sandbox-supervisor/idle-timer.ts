export const IDLE_GRACE_MS = 60_000;

// Observed by the command loop to decide when to pause. Seeded at construction
// so a supervisor that never receives events still times out after
// IDLE_GRACE_MS rather than polling forever. Create the tracker right before
// the pump starts so cold-start latency doesn't eat into the grace window.
//   - reset()  : a non-idle session event arrived; the session is busy, no
//                timeout should run (lastIdleAt = null).
//   - setIdle(): session.idle arrived; start counting the grace from now.
export type IdleTracker = {
  getLastIdleAt: () => null | number;
  reset: () => void;
  setIdle: () => void;
};

export function createIdleTracker(): IdleTracker {
  let lastIdleAt: null | number = Date.now();
  return {
    getLastIdleAt: () => lastIdleAt,
    reset: () => {
      lastIdleAt = null;
    },
    setIdle: () => {
      lastIdleAt = Date.now();
    },
  };
}
