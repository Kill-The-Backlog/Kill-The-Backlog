import { Sandbox } from "e2b";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

type JobData = { sessionId: string };

export const createSandboxWorker = defineWorker<JobData>(
  "create-sandbox",
  async (job) => {
    const { sessionId } = job.data;

    let sandbox: Sandbox | undefined;
    try {
      sandbox = await Sandbox.create({
        apiKey: serverEnv.E2B_API_KEY,
      });

      await db
        .updateTable("Session")
        .set({ e2bSandboxId: sandbox.sandboxId, updatedAt: new Date() })
        .where("id", "=", sessionId)
        .execute();
    } finally {
      await sandbox?.kill();
    }
  },
);
