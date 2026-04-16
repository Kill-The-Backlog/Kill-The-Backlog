import { createOpencodeClient } from "@opencode-ai/sdk/v2";
import { Sandbox } from "e2b";
import invariant from "tiny-invariant";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

import { createEventsSubscription } from "./opencode-events.js";
import { sendPrompt, startOpencodeServer } from "./opencode-server.js";

type JobData = { sessionId: string };

export const createSandboxWorker = defineWorker<JobData>(
  "create-sandbox",
  async (job) => {
    const { sessionId } = job.data;

    const session = await db
      .selectFrom("Session")
      .select(["prompt"])
      .where("id", "=", sessionId)
      .executeTakeFirst();
    invariant(session, `Session not found: ${sessionId}`);

    let sandbox: Sandbox | undefined;
    let subscription: ReturnType<typeof createEventsSubscription> | undefined;
    try {
      sandbox = await Sandbox.create("opencode", {
        apiKey: serverEnv.E2B_API_KEY,
      });

      await db
        .updateTable("Session")
        .set({ e2bSandboxId: sandbox.sandboxId, updatedAt: new Date() })
        .where("id", "=", sessionId)
        .execute();

      const baseUrl = await startOpencodeServer(sandbox, job);
      const client = createOpencodeClient({ baseUrl });

      subscription = createEventsSubscription({ client, job, sessionId });

      await sendPrompt(client, session.prompt);
    } finally {
      await subscription?.drain();
      await sandbox?.kill();
    }
  },
);
