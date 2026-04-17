import { db } from "#lib/.server/clients/db.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

import type { EnsuredSandbox } from "./ensure-sandbox.js";

import { runCommandLoop } from "./command-loop.js";
import { ensureSandbox } from "./ensure-sandbox.js";
import { runEventPump } from "./event-pump.js";
import { formatError } from "./format-error.js";
import { createIdleTracker } from "./idle-timer.js";
import { subscribeToSessionNotifications } from "./notify.js";
import { queryMarkSandboxStatus } from "./sandbox-status.js";

type JobData = { sessionId: string };

export const sandboxSupervisorWorker = defineWorker<JobData>(
  "sandbox-supervisor",
  async (job) => {
    const { sessionId } = job.data;

    await queryResetStaleProcessingCommands(sessionId);

    const abortController = new AbortController();
    const signal = abortController.signal;

    let sandboxRef: EnsuredSandbox | undefined;

    const notifications = await subscribeToSessionNotifications(
      sessionId,
      signal,
    );

    try {
      const tracker = createIdleTracker();

      sandboxRef = await ensureSandbox({ job, sessionId });
      const { client, opencodeSessionId } = sandboxRef;

      // Start the event pump in the background; it writes DB state reactively
      // and feeds the idle tracker. Pump exits when signal aborts.
      const pumpPromise = runEventPump({
        client,
        job,
        opencodeSessionId,
        sessionId,
        signal,
        tracker,
      });

      try {
        await runCommandLoop({
          client,
          job,
          notifications,
          opencodeSessionId,
          sessionId,
          signal,
          tracker,
        });
      } finally {
        // Signal the pump to unwind its for-await, then surface any error it
        // hit. Pump failures mean lost event writes / a stale idle tracker, so
        // they should mark the sandbox errored like any other supervisor fault.
        abortController.abort();
        await pumpPromise;
      }
    } catch (error) {
      await queryMarkSandboxStatus({
        errorMessage: formatError(error),
        sandboxStatus: "errored",
        sessionId,
      });
      throw error;
    } finally {
      // Covers the path where ensureSandbox throws before the pump starts;
      // subsequent abort() calls are no-ops.
      abortController.abort();

      try {
        await notifications.close();
      } catch (error) {
        await job.log(`Notify close error: ${formatError(error)}`);
      }

      await pauseSandbox({ sandboxRef, sessionId });
    }
  },
  {
    defaultJobOptions: {
      // A supervisor run is long-lived (up to idle grace + command processing).
      // Override BullMQ's default attempts=1/no-backoff: if the supervisor
      // crashes mid-run, retry once with a small delay so a transient infra
      // blip doesn't leave the sandbox orphaned.
      attempts: 2,
      backoff: { delay: 1_000, type: "fixed" },
    },
    // Each supervisor holds a sandbox open; cap concurrent runs to stay within
    // our E2B limits. Start conservative.
    workerConcurrency: 5,
  },
);

// Drain-race handler: while a supervisor run is still 'active', any route
// action that enqueues with replaceFinished: true is turned into a no-op by
// BullMQ's jobId dedup (replaceFinished only removes completed/failed jobs).
// Hooking 'completed' runs AFTER BullMQ marks the job completed, so the same
// enqueue call can now successfully replace it and pick up commands that
// slipped in during teardown.
sandboxSupervisorWorker.bullWorker.on("completed", (job) => {
  void reenqueueIfPending(job.data.sessionId);
});

// Always try to pause — killing the sandbox deletes the opencode session data
// on its filesystem, losing the conversation permanently. Most "errored"
// outcomes are supervisor-side (DB write, transient network) while the sandbox
// itself is healthy, so snapshotting is safe. If the sandbox is genuinely
// broken and pause fails, ensureSandbox's resume → provision fallback will
// re-provision on the next command.
async function pauseSandbox({
  sandboxRef,
  sessionId,
}: {
  sandboxRef: EnsuredSandbox | undefined;
  sessionId: string;
}): Promise<void> {
  if (!sandboxRef) return;

  const { sandbox } = sandboxRef;

  await queryMarkSandboxStatus({ sandboxStatus: "pausing", sessionId });
  try {
    await sandbox.pause();
    await queryMarkSandboxStatus({ sandboxStatus: "paused", sessionId });
  } catch (error) {
    await queryMarkSandboxStatus({
      errorMessage: `Pause failed: ${formatError(error)}`,
      sandboxStatus: "errored",
      sessionId,
    });
  }
}

async function queryHasPendingCommands(sessionId: string): Promise<boolean> {
  const row = await db
    .selectFrom("SessionCommand")
    .where("sessionId", "=", sessionId)
    .where("status", "=", "pending")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .executeTakeFirst();
  return Number(row?.count ?? 0) > 0;
}

// Flips any SessionCommand rows stuck in 'processing' back to 'pending'.
// BullMQ guarantees at most one supervisor per sessionId, so any row still in
// 'processing' belongs to a previous supervisor that died mid-dispatch.
async function queryResetStaleProcessingCommands(
  sessionId: string,
): Promise<void> {
  await db
    .updateTable("SessionCommand")
    .set({ status: "pending", updatedAt: new Date() })
    .where("sessionId", "=", sessionId)
    .where("status", "=", "processing")
    .execute();
}

async function reenqueueIfPending(sessionId: string): Promise<void> {
  try {
    if (!(await queryHasPendingCommands(sessionId))) return;
    await sandboxSupervisorWorker.enqueue(
      { sessionId },
      { jobId: sessionId, replaceFinished: true },
    );
  } catch (error) {
    console.error(
      `[sandbox-supervisor] Reenqueue check failed for ${sessionId}:`,
      error,
    );
  }
}
