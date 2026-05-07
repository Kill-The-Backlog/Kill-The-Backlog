import type { Sandbox } from "e2b";

import { setTimeout as sleep } from "node:timers/promises";

import { PREVIEW_PORT, PREVIEW_STATUS } from "#lib/session-preview.js";

const PREVIEW_HEALTH_POLL_INTERVAL_MS = 2_000;
const PREVIEW_START_TIMEOUT_MS = 5 * 60_000;

export type PreviewReadyResult =
  | {
      message: string;
      type: PreviewReadinessFailureStatus;
    }
  | { type: "ready" };

type PreviewReadinessFailureStatus =
  | typeof PREVIEW_STATUS.crashed
  | typeof PREVIEW_STATUS.unhealthy;

export async function waitForPreviewReady({
  pid,
  sandbox,
}: {
  pid: number;
  sandbox: Sandbox;
}): Promise<PreviewReadyResult> {
  const deadline = Date.now() + PREVIEW_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!(await isProcessRunning(sandbox, pid))) {
      return {
        message: "Preview script exited before becoming ready",
        type: PREVIEW_STATUS.crashed,
      };
    }
    if (await isPreviewHealthy(sandbox)) return { type: "ready" };
    await sleep(PREVIEW_HEALTH_POLL_INTERVAL_MS);
  }

  return {
    message: "Preview script did not become ready before the startup timeout",
    type: PREVIEW_STATUS.unhealthy,
  };
}

async function isPreviewHealthy(sandbox: Sandbox): Promise<boolean> {
  try {
    await sandbox.commands.run(
      `curl -fsS http://127.0.0.1:${PREVIEW_PORT}/ >/dev/null`,
      { timeoutMs: 5_000 },
    );
    return true;
  } catch {
    return false;
  }
}

async function isProcessRunning(sandbox: Sandbox, pid: number): Promise<boolean> {
  const processes = await sandbox.commands.list();
  return processes.some((process) => process.pid === pid);
}
