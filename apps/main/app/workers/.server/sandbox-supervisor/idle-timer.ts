export const IDLE_GRACE_MS = 60_000;

// Observed by the command loop to decide when to pause. Reset on any non-idle
// event (generation is active); set to now() when session.idle fires.
export type IdleTracker = {
  getLastIdleAt: () => null | number;
  reset: () => void;
  setIdle: () => void;
};

export function createIdleTracker(): IdleTracker {
  let lastIdleAt: null | number = null;
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
