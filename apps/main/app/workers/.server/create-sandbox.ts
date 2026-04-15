import type { OpencodeClient } from "@opencode-ai/sdk";
import type { Job } from "bullmq";

import { createOpencodeClient } from "@opencode-ai/sdk";
import { Sandbox } from "e2b";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { defineWorker } from "#lib/.server/workers/define-worker.js";

type JobData = { sessionId: string };

const OPENCODE_PORT = 4096;
const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 10_000;
const EVENTS_DRAIN_TIMEOUT_MS = 10_000;

function createEventsSubscription({
  client,
  job,
}: {
  client: OpencodeClient;
  job: Job;
}) {
  const abortController = new AbortController();
  const promise = subscribeToEvents({
    client,
    job,
    signal: abortController.signal,
  });

  return {
    async drain() {
      const timeout = setTimeout(() => {
        abortController.abort();
      }, EVENTS_DRAIN_TIMEOUT_MS);

      try {
        await promise;
      } catch (error) {
        await job.log(`Events subscription error: ${String(error)}`);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

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

async function sendPrompt(client: OpencodeClient, job: Job): Promise<void> {
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
}

async function startOpencodeServer(
  sandbox: Sandbox,
  job: Job,
): Promise<string> {
  await sandbox.commands.run(
    `opencode serve --hostname 0.0.0.0 --port ${OPENCODE_PORT}`,
    { background: true },
  );

  const hostname = sandbox.getHost(OPENCODE_PORT);
  const baseUrl = `https://${hostname}`;

  // @todo: this url isn't guessable, but should be secured
  await job.log(`Sandbox URL: ${baseUrl}`);

  const healthStartMs = performance.now();
  await pollUntilHealthOk(`${baseUrl}/global/health`, {
    intervalMs: HEALTH_POLL_INTERVAL_MS,
    timeoutMs: HEALTH_POLL_TIMEOUT_MS,
  });
  const healthElapsedMs = Math.round(performance.now() - healthStartMs);
  await job.log(`Sandbox healthy after ${healthElapsedMs}ms`);

  return baseUrl;
}

async function subscribeToEvents({
  client,
  job,
  signal,
}: {
  client: OpencodeClient;
  job: Job;
  signal: AbortSignal;
}) {
  const { stream } = await client.event.subscribe();

  const abortStream = () => {
    void stream.throw(new Error("Subscription aborted"));
  };
  signal.addEventListener("abort", abortStream);

  try {
    for await (const event of stream) {
      await job.log(JSON.stringify(event, null, 2));

      // Return once session is idle
      if (event.type === "session.idle") {
        break;
      }
    }
  } finally {
    signal.removeEventListener("abort", abortStream);
  }
}

export const createSandboxWorker = defineWorker<JobData>(
  "create-sandbox",
  async (job) => {
    const { sessionId } = job.data;

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

      subscription = createEventsSubscription({ client, job });

      await sendPrompt(client, job);
    } finally {
      await subscription?.drain();
      await sandbox?.kill();
    }
  },
);
