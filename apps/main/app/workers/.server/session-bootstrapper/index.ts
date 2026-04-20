import { createOpencodeClient } from "@opencode-ai/sdk/v2";
import { Sandbox } from "e2b";
import invariant from "tiny-invariant";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { formatError } from "#lib/.server/format-error.js";
import { opencodeBaseUrl } from "#lib/.server/opencode/base-url.js";
import { dispatchPrompt } from "#lib/.server/sessions/dispatch-prompt.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

type JobData = {
  initialPrompt: string;
  repoFullName: string;
  sessionId: string;
  userId: number;
};

// The e2bdev/base image runs commands as the non-root `user` account with
// `/home/user` as its home directory. We clone selected repos into a
// subdirectory there so opencode's session (rooted at the same path) can
// see them without extra configuration.
const SANDBOX_HOME_DIR = "/home/user";

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
    const { initialPrompt, repoFullName, sessionId, userId } = job.data;

    // Clear any prior errorMessage so a retry starts from a clean slate and
    // the UI's error alert reflects only this attempt. If bootstrapping fails
    // again, the catch below records a fresh message.
    await queryPatchSession(sessionId, { errorMessage: null });

    let sandbox: Sandbox | undefined;
    try {
      const repoName = repoFullName.split("/")[1];
      invariant(repoName, `Invalid repoFullName: ${repoFullName}`);
      const clonePath = `${SANDBOX_HOME_DIR}/${repoName}`;

      const githubAccount = await db
        .selectFrom("GitHubAccount")
        .select("oauthAccessToken")
        .where("userId", "=", userId)
        .executeTakeFirst();
      if (!githubAccount) {
        throw new Error("GitHub account not linked for user");
      }

      sandbox = await Sandbox.create(serverEnv.E2B_TEMPLATE_NAME, {
        apiKey: serverEnv.E2B_API_KEY,
        lifecycle: {
          autoResume: true,
          onTimeout: "pause",
        },
      });

      // Clone the user's selected repo into the sandbox before the opencode
      // session is created, so that session is rooted inside a populated
      // working tree. Using the typed git helper (over a raw shell command)
      // keeps auth out of the command line — the OAuth token is transmitted
      // via the E2B control channel — and `x-access-token` is GitHub's
      // recommended basic-auth username for OAuth user tokens.
      await sandbox.git.clone(`https://github.com/${repoFullName}.git`, {
        password: githubAccount.oauthAccessToken,
        path: clonePath,
        username: "x-access-token",
      });

      const baseUrl = opencodeBaseUrl(sandbox.sandboxId);
      await job.log(`Sandbox opencode URL: ${baseUrl}`);
      // Setting `directory` on the client propagates it as a query param on
      // every request, so `session.create` records the cloned repo path as
      // the session root. Session-scoped follow-up calls (prompts, event
      // streams) address the session by ID and inherit that root, so they
      // don't need to re-set the directory.
      const client = createOpencodeClient({ baseUrl, directory: clonePath });

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
