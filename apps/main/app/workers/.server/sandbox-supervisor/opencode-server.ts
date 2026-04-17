import type { Job } from "bullmq";
import type { Sandbox } from "e2b";

import { createOpencodeClient } from "@opencode-ai/sdk/v2";

export const OPENCODE_PORT = 4096;
const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 30_000;

export function opencodeBaseUrl(sandbox: Sandbox): string {
  return `https://${sandbox.getHost(OPENCODE_PORT)}`;
}

export async function startOpencodeServer(
  sandbox: Sandbox,
  job: Job,
): Promise<string> {
  // Detach from envd so opencode survives E2B pause: envd kills its tracked
  // children (including `{ background: true }` commands) on pause, but a
  // detached shell job is orphaned to init and left alone.
  await sandbox.commands.run(
    `opencode serve --hostname 0.0.0.0 --port ${OPENCODE_PORT} > /tmp/opencode.log 2>&1 < /dev/null &`,
  );

  // @todo: this url isn't guessable, but should be secured
  await job.log(`Sandbox URL: ${opencodeBaseUrl(sandbox)}`);

  return waitForOpencodeHealth(sandbox, job);
}

export async function waitForOpencodeHealth(
  sandbox: Sandbox,
  job: Job,
): Promise<string> {
  const baseUrl = opencodeBaseUrl(sandbox);
  const client = createOpencodeClient({ baseUrl });
  const deadline = AbortSignal.timeout(HEALTH_POLL_TIMEOUT_MS);
  const startMs = performance.now();

  while (!deadline.aborted) {
    try {
      const res = await client.global.health({ signal: deadline });
      if (res.data?.healthy) {
        await job.log(
          `Sandbox healthy after ${Math.round(performance.now() - startMs)}ms`,
        );
        return baseUrl;
      }
    } catch {
      // Swallow transient errors; the deadline check below ends the loop.
    }

    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for opencode health at ${baseUrl}`);
}
