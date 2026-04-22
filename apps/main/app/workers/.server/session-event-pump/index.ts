import type { Job } from "bullmq";

import { Octokit } from "@octokit/rest";
import { Sandbox } from "e2b";

import type { BootstrappedSession } from "#lib/.server/sessions/require-bootstrapped-session.js";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { formatError } from "#lib/.server/format-error.js";
import { opencodeBaseUrl } from "#lib/.server/opencode/base-url.js";
import { branchNameForSession } from "#lib/.server/sandbox-git/branch-name.js";
import { clonePathForRepo } from "#lib/.server/sandbox-git/clone-path.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { requireBootstrappedSession } from "#lib/.server/sessions/require-bootstrapped-session.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

import { tryCommitTurn } from "./commit-on-idle.js";
import { runEventPump } from "./event-pump.js";
import { pushAndEnsurePR } from "./push-and-ensure-pr.js";

type JobData = { sessionId: string };

// Streams opencode's SSE feed into the DB for a session and pauses the
// sandbox once opencode has been continuously idle for the grace window.
// Doesn't care whether the sandbox is currently running or paused —
// sandboxes are created with `autoResume: true`, so the first HTTP hit to
// the opencode URL wakes a paused VM transparently.
//
// On every idle emitted by the pump, the `onIdle` callback below commits
// the turn and — if a commit was actually made — pushes it and opens the
// draft PR on the first commit. The pump itself doesn't know about git or
// GitHub; it just tells us when opencode has settled. PR number is tracked
// in a closure-local `let` so we don't re-query the DB on every commit.
//
// Runs are idempotent by jobId=sessionId: enqueuing the pump while an
// existing run is active no-ops (BullMQ dedupes), and enqueuing after the
// previous run finished replaces the finished job.
export const sessionEventPumpWorker = defineWorker<JobData>(
  "session-event-pump",
  async (job) => {
    const { sessionId } = job.data;

    let session: BootstrappedSession | undefined;
    let errored = false;

    try {
      session = await requireBootstrappedSession(sessionId);
      const clonePath = clonePathForRepo(session.repoFullName);
      const branchName = branchNameForSession(sessionId);
      // Capture into a const so the onIdle closure doesn't have to
      // re-narrow the outer `let session` on every invocation.
      const repoFullName = session.repoFullName;

      // Connect gives us a sandbox handle for git operations during the
      // pump (commit + push on idle). Paused VMs are resumed transparently —
      // we don't need to check state first.
      const sandbox = await Sandbox.connect(session.e2bSandboxId, {
        apiKey: serverEnv.E2B_API_KEY,
      });

      // Fetch the GitHub auth once and thread it through the callback. The
      // bootstrapper already required a linked account to clone the repo,
      // so if it's missing here something was unlinked mid-session — fail
      // the run and let the user re-link rather than silently running a
      // pump that can never push.
      const ghAccount = await db
        .selectFrom("GitHubAccount")
        .select(["oauthAccessToken"])
        .where("userId", "=", session.userId)
        .executeTakeFirst();
      if (!ghAccount) {
        throw new Error("GitHub account not linked for user");
      }
      const { oauthAccessToken } = ghAccount;
      const octokit = new Octokit({ auth: oauthAccessToken });

      // Tracks the PR number across per-commit pushes so the first commit
      // opens the draft PR and every subsequent commit skips PR creation.
      // Persisted to the DB inside `pushAndEnsurePR`; this local mirrors
      // it to avoid a re-query on every turn.
      let prNumber: null | number = session.prNumber;

      await runEventPump({
        job,
        onIdle: async () => {
          const committed = await tryCommitTurn({
            clonePath,
            job,
            sandbox,
            sessionId,
          });
          if (!committed) return;
          prNumber = await pushAndEnsurePR({
            branchName,
            clonePath,
            currentPrNumber: prNumber,
            job,
            oauthAccessToken,
            octokit,
            repoFullName,
            sandbox,
            sessionId,
          });
        },
        opencodeBaseUrl: opencodeBaseUrl(session.e2bSandboxId),
        opencodeSessionId: session.opencodeSessionId,
        sessionId,
      });
    } catch (error) {
      errored = true;
      await queryPatchSession(sessionId, { errorMessage: formatError(error) });
      throw error;
    } finally {
      if (session?.e2bSandboxId) {
        await pauseSandbox({
          e2bSandboxId: session.e2bSandboxId,
          errored,
          job,
          sessionId,
        });
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
