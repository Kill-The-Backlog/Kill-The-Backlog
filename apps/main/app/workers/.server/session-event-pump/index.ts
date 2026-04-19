import type { Job } from "bullmq";

import { Sandbox } from "e2b";

import { serverEnv } from "#lib/.server/env/server.js";
import { formatError } from "#lib/.server/format-error.js";
import { opencodeBaseUrl } from "#lib/.server/opencode/base-url.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { requireBootstrappedSession } from "#lib/.server/sessions/require-bootstrapped-session.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

import { runEventPump } from "./event-pump.js";

type JobData = { sessionId: string };

// Streams opencode's SSE feed into the DB for a session and pauses the
// sandbox once opencode has been continuously idle for the grace window.
// Doesn't care whether the sandbox is currently running or paused —
// sandboxes are created with `autoResume: true`, so the first HTTP hit to
// the opencode URL wakes a paused VM transparently.
//
// Runs are idempotent by jobId=sessionId: enqueuing the pump while an
// existing run is active no-ops (BullMQ dedupes), and enqueuing after the
// previous run finished replaces the finished job.
export const sessionEventPumpWorker = defineWorker<JobData>(
  "session-event-pump",
  async (job) => {
    const { sessionId } = job.data;

    let e2bSandboxId: string | undefined;
    let errored = false;

    try {
      const session = await requireBootstrappedSession(sessionId);
      e2bSandboxId = session.e2bSandboxId;

      await runEventPump({
        job,
        opencodeBaseUrl: opencodeBaseUrl(session.e2bSandboxId),
        opencodeSessionId: session.opencodeSessionId,
        sessionId,
      });
    } catch (error) {
      errored = true;
      await queryPatchSession(sessionId, { errorMessage: formatError(error) });
      throw error;
    } finally {
      if (e2bSandboxId) {
        await pauseSandbox({ e2bSandboxId, errored, job, sessionId });
      }
    }
  },
  {
    defaultJobOptions: {
      // A pump run is long-lived (up to idle grace + command processing). If
      // it crashes mid-run, retry once with a small delay so a transient
      // infra blip doesn't leave the session without a listener.
      attempts: 2,
      backoff: { delay: 1_000, type: "fixed" },
    },
    // Each pump holds an SSE connection open; cap concurrent runs to stay
    // within our E2B limits. Start conservative.
    workerConcurrency: 5,
  },
);

// Snapshot the sandbox at the end of the run. Killing it would delete the
// opencode session data on the VM filesystem and lose the conversation, so
// we always prefer pausing. On the happy path, a pause failure flips the
// session to errored.
async function pauseSandbox({
  e2bSandboxId,
  errored,
  job,
  sessionId,
}: {
  e2bSandboxId: string;
  errored: boolean;
  job: Job;
  sessionId: string;
}): Promise<void> {
  try {
    await Sandbox.pause(e2bSandboxId, { apiKey: serverEnv.E2B_API_KEY });
  } catch (error) {
    if (errored) {
      // The run already recorded its own error, so just log the pause
      // failure to the job log — overwriting `errorMessage` here would
      // clobber the upstream error with a secondary cleanup failure.
      await job.log(`Pause failed during error cleanup: ${formatError(error)}`);
      return;
    }
    await queryPatchSession(sessionId, {
      errorMessage: `Pause failed: ${formatError(error)}`,
    });
  }
}
