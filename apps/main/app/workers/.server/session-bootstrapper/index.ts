import { createOpencodeClient } from "@opencode-ai/sdk/v2";
import { Sandbox } from "e2b";

import { serverEnv } from "#lib/.server/env/server.js";
import { formatError } from "#lib/.server/format-error.js";
import { opencodeBaseUrl } from "#lib/.server/opencode/base-url.js";
import { dispatchPrompt } from "#lib/.server/sessions/dispatch-prompt.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

type JobData = { initialPrompt: string; sessionId: string };

// Bootstraps a new session: creates the E2B sandbox, creates an opencode
// session inside it, persists the IDs, and dispatches the session's
// initial prompt (which also queues the event pump so it starts streaming
// events). Only runs once per session — follow-up prompts go through the
// `$sessionId` route, which uses `dispatchPrompt` directly.
//
// Sandboxes are created with `autoResume: true` so that any later HTTP hit
// to their public URL (follow-up prompts, the event pump's SSE GET) wakes
// the paused VM transparently; neither the pump worker nor the follow-up
// path needs to call `Sandbox.connect`.
export const sessionBootstrapperWorker = defineWorker<JobData>(
  "session-bootstrapper",
  async (job) => {
    const { initialPrompt, sessionId } = job.data;

    // Clear any prior errorMessage so a retry starts from a clean slate and
    // the UI's error alert reflects only this attempt. If bootstrapping fails
    // again, the catch below records a fresh message.
    await queryPatchSession(sessionId, { errorMessage: null });

    let sandbox: Sandbox | undefined;
    try {
      sandbox = await Sandbox.create(serverEnv.E2B_TEMPLATE_NAME, {
        apiKey: serverEnv.E2B_API_KEY,
        lifecycle: {
          autoResume: true,
          onTimeout: "pause",
        },
      });

      const baseUrl = opencodeBaseUrl(sandbox.sandboxId);
      await job.log(`Sandbox opencode URL: ${baseUrl}`);
      const client = createOpencodeClient({ baseUrl });

      const opencodeSession = await client.session.create();
      if (opencodeSession.error) {
        throw new Error("Failed to create opencode session", {
          cause: opencodeSession.error,
        });
      }

      await queryPatchSession(sessionId, {
        e2bSandboxId: sandbox.sandboxId,
        opencodeSessionId: opencodeSession.data.id,
      });

      await dispatchPrompt({
        e2bSandboxId: sandbox.sandboxId,
        opencodeSessionId: opencodeSession.data.id,
        sessionId,
        text: initialPrompt,
      });
    } catch (error) {
      if (sandbox) {
        try {
          await sandbox.kill();
        } catch (killError) {
          await job.log(
            `Failed to kill sandbox ${sandbox.sandboxId} during bootstrap cleanup: ${formatError(killError)}`,
          );
        }
      }
      await queryPatchSession(sessionId, { errorMessage: formatError(error) });
      throw error;
    }
  },
  {
    defaultJobOptions: {
      // Bootstrapping touches the E2B API + opencode; retry once on a transient
      // blip so we don't need a manual retry from the UI.
      attempts: 2,
      backoff: { delay: 1_000, type: "fixed" },
    },
    // Cap parallel bootstraps to stay within E2B limits. Start conservative.
    workerConcurrency: 5,
  },
);
