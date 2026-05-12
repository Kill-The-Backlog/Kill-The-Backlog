import { Sandbox } from "e2b";

import { serverEnv } from "#lib/.server/env/server.js";
import { formatError } from "#lib/.server/format-error.js";
import { clonePathForRepo } from "#lib/.server/sandbox-git/clone-path.js";
import { startSessionEditor } from "#lib/.server/session-editor/lifecycle.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { requireBootstrappedSession } from "#lib/.server/sessions/require-bootstrapped-session.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";
import { EDITOR_STATUS } from "#lib/session-editor.js";

type JobData = { sessionId: string };

export const sessionEditorStarterWorker = defineWorker<JobData>(
  "session-editor-starter",
  async (job) => {
    const { sessionId } = job.data;

    try {
      const session = await requireBootstrappedSession(sessionId);
      const sandbox = await Sandbox.connect(session.e2bSandboxId, {
        apiKey: serverEnv.E2B_API_KEY,
      });
      const clonePath = clonePathForRepo(session.repoFullName);

      await startSessionEditor({ clonePath, job, sandbox, sessionId });
    } catch (error) {
      const message = formatError(error);
      await queryPatchSession(sessionId, {
        editorErrorMessage: message,
        editorStatus: EDITOR_STATUS.failed,
      });
      await job.log(`[editor] worker failed: ${message}`);
      throw error;
    }
  },
  {
    defaultJobOptions: {
      attempts: 2,
      backoff: { delay: 1_000, type: "fixed" },
    },
    workerConcurrency: 5,
  },
);
