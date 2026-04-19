import type { SessionStatus } from "@opencode-ai/sdk/v2";

export const IDLE_GRACE_MS = 60_000;

// Fires `onIdle` after opencode has been continuously idle for IDLE_GRACE_MS.
// Seeded at construction so a pump that never receives events still times out
// rather than waiting forever — `runEventPump` builds the timer right before
// its main loop so cold-start latency doesn't eat into the grace window.
//   - onStatus(): a `session.status` event arrived; arm or disarm based on it.
//   - cancel()  : stop the timer entirely (worker teardown).
export type IdleTimer = {
  cancel: () => void;
  onStatus: (status: SessionStatus) => void;
};

export function createIdleTimer(onIdle: () => void): IdleTimer {
  let timer: NodeJS.Timeout | null = null;

  const arm = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onIdle();
    }, IDLE_GRACE_MS);
  };

  const disarm = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  arm();

  return {
    cancel: disarm,
    onStatus: (status) => {
      if (status.type === "idle") arm();
      else disarm();
    },
  };
}
