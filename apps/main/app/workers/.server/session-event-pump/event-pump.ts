import type { Event } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";

import { ReadableStream } from "node:stream/web";
import { setTimeout as sleep } from "node:timers/promises";

import { formatError } from "#lib/.server/format-error.js";

import type { IdleTimer } from "./idle-timer.js";

import { applySnapshot } from "./apply-snapshot.js";
import { handleEvent } from "./handle-event.js";
import { createIdleTimer } from "./idle-timer.js";
import { openOpencodeEventStream } from "./opencode-events.js";
import { fetchSessionSnapshot } from "./opencode-snapshot.js";

// Fixed pause between reconnect attempts. Short enough to recover quickly
// from transient blips, long enough not to hammer opencode while it's down.
// The idle timer and worker signal are the real ceiling on how long we'll
// keep trying; BullMQ only retries the whole job for worker-level failures.
const RECONNECT_DELAY_MS = 1_000;

// Streams opencode events into the DB for a session. Because opencode's
// `/event` stream has no replay, each (re)connect follows a
// subscribe-then-snapshot flow:
//
//  1. Open the SSE stream and start buffering every event that arrives.
//  2. Fetch the authoritative `GET /session/:id/message` snapshot and apply
//     it to our DB (idempotent upserts + reconcile of stale rows).
//  3. Drain the buffer and then continue tailing live events in-place.
//
// All of opencode's persisted events are full snapshots of their aggregate,
// so re-applying an event that's also already reflected in the snapshot is
// a no-op. The idle timer owns the decision of when the pump exits: when
// opencode has been continuously idle for the grace window, it aborts the
// internal controller and the outer loop exits cleanly.
export async function runEventPump({
  job,
  opencodeBaseUrl,
  opencodeSessionId,
  sessionId,
}: {
  job: Job;
  opencodeBaseUrl: string;
  opencodeSessionId: string;
  sessionId: string;
}): Promise<void> {
  await job.log(
    `[pump] start sessionId=${sessionId} opencodeSessionId=${opencodeSessionId}`,
  );

  // Construct the timer right before the pump loop starts so cold-start
  // latency (DB fetch, worker pickup) doesn't eat into the grace window.
  const abortController = new AbortController();
  const timer = createIdleTimer(() => {
    abortController.abort();
  });
  const { signal } = abortController;

  // Paused sandboxes auto-resume on first HTTP traffic (E2B holds the
  // request until the VM is back), so the first SSE fetch and snapshot
  // fetch block through resume without needing a pre-probe. The loop only
  // retries on genuine connection failures — stream drop, opencode crash,
  // transient network blip — capped by the idle timer.
  try {
    while (!signal.aborted) {
      try {
        await runSingleConnection({
          job,
          opencodeBaseUrl,
          opencodeSessionId,
          sessionId,
          signal,
          timer,
        });
      } catch (error) {
        // An abort mid-connection surfaces here as a fetch/SSE rejection;
        // bail before it gets logged as a spurious connection error. TS
        // narrows `signal.aborted` to `false` from the loop condition
        // above, but the signal is externally mutable — the runtime check
        // is real.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (signal.aborted) break;
        await job.log(
          `[pump] connection error sessionId=${sessionId}: ${formatError(error)}`,
        );
        await sleep(RECONNECT_DELAY_MS, undefined, { signal }).catch(
          () => undefined,
        );
      }
    }
  } finally {
    timer.cancel();
  }

  await job.log(`[pump] aborted sessionId=${sessionId}`);
}

function eventBelongsToSession(
  event: Event,
  opencodeSessionId: string,
): boolean {
  return (
    !("sessionID" in event.properties) ||
    event.properties.sessionID === opencodeSessionId
  );
}

// Runs one subscribe-then-snapshot cycle. Returns when the SSE stream ends
// cleanly; throws on connect / snapshot / stream errors so the outer loop
// can back off and retry. The SSE connect happens (and fully resolves)
// before the snapshot fetch, so there is no window where an event emitted
// by opencode is in neither the snapshot nor our buffer. The stream buffer
// preserves strict ordering: every event yielded by the SSE generator is
// dispatched in arrival order, but only after the snapshot has landed,
// so the snapshot never overwrites a newer live event.
async function runSingleConnection({
  job,
  opencodeBaseUrl,
  opencodeSessionId,
  sessionId,
  signal,
  timer,
}: {
  job: Job;
  opencodeBaseUrl: string;
  opencodeSessionId: string;
  sessionId: string;
  signal: AbortSignal;
  timer: IdleTimer;
}): Promise<void> {
  // Connection-scoped signal so we can shut the SSE producer down
  // independently of the worker's signal — e.g. when the snapshot fetch
  // fails or the consumer throws mid-drain. Without this, the producer
  // would stay blocked on `reader.read()` until the worker aborts.
  const connection = new AbortController();
  const streamSignal = AbortSignal.any([signal, connection.signal]);

  // Await the SSE connection FIRST — `openOpencodeEventStream` resolves
  // only after opencode has sent response headers, meaning any event it
  // emits from this moment on is being captured on the wire. Fetching the
  // snapshot before this point would race the SSE connect: if the
  // snapshot's server-side cutoff landed before our `/event` request hit,
  // any event in the gap between snapshot and connect would be in neither
  // place and be silently lost.
  const eventGenerator = await openOpencodeEventStream({
    opencodeBaseUrl,
    signal: streamSignal,
  });

  // Wrap the generator in a ReadableStream so the SSE socket keeps
  // draining into an in-memory queue while we fetch + apply the snapshot.
  // Events dispatched from this buffer preserve arrival order, and the
  // consumer below only starts pulling after the snapshot has landed so
  // the snapshot never overwrites a newer live event.
  const events = new ReadableStream<Event>({
    cancel(reason) {
      connection.abort(reason);
    },
    async start(controller) {
      try {
        for await (const event of eventGenerator) {
          controller.enqueue(event);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  try {
    const messages = await fetchSessionSnapshot({
      opencodeBaseUrl,
      opencodeSessionId,
      signal,
    });
    await applySnapshot({ messages, sessionId });
    await job.log(
      `[pump] snapshot applied sessionId=${sessionId} messages=${messages.length}`,
    );
  } catch (error) {
    await events.cancel().catch(() => undefined);
    throw error;
  }

  for await (const event of events) {
    if (!eventBelongsToSession(event, opencodeSessionId)) continue;

    // Drive the idle timer ONLY from `session.status`, which is opencode's
    // authoritative state machine (idle | busy | retry). Events like
    // `session.updated`, `session.diff`, and `message.updated` continue to
    // arrive AFTER `session.idle` as part of opencode's finalization writes,
    // so using "any session event" as activity would never let the grace
    // window expire.
    if (event.type === "session.status") {
      timer.onStatus(event.properties.status);
    }

    await handleEvent(event, { job, sessionId });
  }

  await job.log(`[pump] stream ended sessionId=${sessionId}`);
}
