import { createOpencodeClient } from "@opencode-ai/sdk";
import { Sandbox } from "e2b";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

type JobData = { sessionId: string };

async function pollUntilHealthOk(
  url: string,
  { intervalMs, timeoutMs }: { intervalMs: number; timeoutMs: number },
): Promise<void> {
  const deadline = AbortSignal.timeout(timeoutMs);

  for (;;) {
    // Wait for the interval
    await new Promise((r) => setTimeout(r, intervalMs));

    // Fetch the health endpoint
    try {
      const res = await fetch(url, { signal: deadline });
      if (res.ok) return;
    } catch (error) {
      if (deadline.aborted) {
        throw new Error(`Timed out waiting for health at ${url}`, {
          cause: error,
        });
      }
    }
  }
}

export const createSandboxWorker = defineWorker<JobData>(
  "create-sandbox",
  async (job) => {
    const { sessionId } = job.data;

    let sandbox: Sandbox | undefined;
    try {
      sandbox = await Sandbox.create("opencode", {
        apiKey: serverEnv.E2B_API_KEY,
      });

      await db
        .updateTable("Session")
        .set({ e2bSandboxId: sandbox.sandboxId, updatedAt: new Date() })
        .where("id", "=", sessionId)
        .execute();

      await sandbox.commands.run(
        "opencode serve --hostname 0.0.0.0 --port 4096",
        { background: true },
      );

      const host = sandbox.getHost(4096);
      const baseUrl = `https://${host}`;

      // @todo: this url isn't guessable, but should be secured
      await job.log(`Sandbox URL: ${baseUrl}`);

      const healthStart = performance.now();
      await pollUntilHealthOk(`${baseUrl}/global/health`, {
        intervalMs: 500,
        timeoutMs: 10_000,
      });
      const healthMs = Math.round(performance.now() - healthStart);
      await job.log(`Sandbox healthy after ${healthMs}ms`);

      const client = createOpencodeClient({
        baseUrl,
      });

      const session = await client.session.create({
        body: { title: "E2B Session" },
      });
      if (session.error) {
        throw new Error("Failed to create opencode session", {
          cause: session.error,
        });
      }

      const result = await client.session.prompt({
        body: {
          parts: [{ text: "Just say 'hello' back!", type: "text" }],
        },
        path: { id: session.data.id },
      });
      if (result.error) {
        throw new Error("Failed to prompt opencode session", {
          cause: result.error,
        });
      }

      await job.log(JSON.stringify(result.data, null, 2));
    } finally {
      await sandbox?.kill();
    }
  },
);
