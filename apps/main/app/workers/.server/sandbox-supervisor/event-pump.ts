import type { Event, OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";

import type { IdleTracker } from "./idle-timer.js";

import { handleEvent } from "./handle-event.js";

// Iterates the opencode SSE event stream and dispatches each event to the
// DB-writing handler. Exits when the signal aborts. The idle tracker owns the
// decision of when to pause.
export async function runEventPump({
  client,
  job,
  opencodeSessionId,
  sessionId,
  signal,
  tracker,
}: {
  client: OpencodeClient;
  job: Job;
  opencodeSessionId: string;
  sessionId: string;
  signal: AbortSignal;
  tracker: IdleTracker;
}): Promise<void> {
  const { stream } = await client.event.subscribe();

  const onAbort = () => {
    // Returning the async iterator cleanly ends the for-await without throwing
    // into it. The SDK's SSE iterator closes the underlying response.
    void stream.return(undefined);
  };
  if (signal.aborted) {
    onAbort();
    return;
  }
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    for await (const event of stream) {
      // opencode's subscribe is server-scoped, not session-scoped. Our setup
      // creates one session per opencode server, so events without sessionID
      // still belong to us. When sessionID IS present, filter defensively.
      if (!eventBelongsToSession(event, opencodeSessionId)) continue;

      if (event.type === "session.idle") {
        tracker.setIdle();
      } else {
        tracker.reset();
      }

      await handleEvent(event, { job, sessionId });
    }
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function eventBelongsToSession(
  event: Event,
  opencodeSessionId: string,
): boolean {
  const sessionID =
    "sessionID" in event.properties ? event.properties.sessionID : undefined;
  return sessionID === undefined || sessionID === opencodeSessionId;
}
