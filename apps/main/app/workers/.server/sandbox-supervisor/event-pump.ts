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
  // Pass the signal down so the SDK's fetch + SSE reader can be aborted
  // mid-read. Without this, stream.return() only queues a return but cannot
  // unblock the pending `await reader.read()`, so the for-await (and the
  // supervisor's pumpPromise await) hangs until the next SSE chunk arrives.
  //
  // The SDK's generator catches the abort internally (it retries by design),
  // then observes signal.aborted at the top of its retry loop and breaks
  // cleanly — so no try/catch is needed around the for-await here.
  const { stream } = await client.event.subscribe(undefined, { signal });

  for await (const event of stream) {
    // opencode's subscribe is server-scoped, not session-scoped. Our setup
    // creates one session per opencode server, so events without sessionID
    // still belong to us. When sessionID IS present, filter defensively.
    if (!eventBelongsToSession(event, opencodeSessionId)) continue;

    // Server-level events (server.heartbeat, server.connected) have no
    // sessionID and aren't session activity, so they must not touch the
    // idle tracker — heartbeats arrive more often than IDLE_GRACE_MS and
    // would otherwise keep resetting the idle window indefinitely.
    if (getEventSessionID(event) !== undefined) {
      if (event.type === "session.idle") {
        tracker.setIdle();
      } else {
        tracker.reset();
      }
    }

    await handleEvent(event, { job, sessionId });
  }
}

function eventBelongsToSession(
  event: Event,
  opencodeSessionId: string,
): boolean {
  const sessionID = getEventSessionID(event);
  return sessionID === undefined || sessionID === opencodeSessionId;
}

function getEventSessionID(event: Event): string | undefined {
  if (!("sessionID" in event.properties)) return undefined;
  const { sessionID } = event.properties;
  return typeof sessionID === "string" ? sessionID : undefined;
}
