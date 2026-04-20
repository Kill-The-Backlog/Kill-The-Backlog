import { generateSessionTitle } from "#lib/.server/sessions/generate-session-title.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

type JobData = {
  initialPrompt: string;
  sessionId: string;
};

// Generates a short sidebar-friendly title for a session by running the
// initial prompt through Anthropic. Runs in parallel with the session
// bootstrapper — titling doesn't depend on the sandbox and finishes long
// before it does, so the sidebar updates quickly after creation.
//
// Failures here are deliberately NOT written to `Session.errorMessage`: a
// missing title just means the sidebar falls back to the raw prompt, which
// the session UI already handles. BullMQ will still log the failure via
// the worker's built-in event handlers.
export const sessionTitlerWorker = defineWorker<JobData>(
  "session-titler",
  async (job) => {
    const { initialPrompt, sessionId } = job.data;
    const title = await generateSessionTitle(initialPrompt);
    await queryPatchSession(sessionId, { title });
    await job.log(`Set title for session ${sessionId}: ${title}`);
  },
  {
    defaultJobOptions: {
      // Titling hits Anthropic; retry once on a transient blip so a
      // rate-limit or flaky network doesn't leave the session untitled.
      attempts: 2,
      backoff: { delay: 1_000, type: "fixed" },
    },
  },
);
