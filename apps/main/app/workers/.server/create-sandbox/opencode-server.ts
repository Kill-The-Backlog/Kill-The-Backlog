import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";
import type { Sandbox } from "e2b";

const OPENCODE_PORT = 4096;
const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 10_000;

export async function sendPrompt(
  client: OpencodeClient,
  prompt: string,
): Promise<void> {
  const session = await client.session.create();
  if (session.error) {
    throw new Error("Failed to create opencode session", {
      cause: session.error,
    });
  }

  const result = await client.session.prompt({
    parts: [{ text: prompt, type: "text" }],
    sessionID: session.data.id,
  });
  if (result.error) {
    throw new Error("Failed to prompt opencode session", {
      cause: result.error,
    });
  }
}

export async function startOpencodeServer(
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
