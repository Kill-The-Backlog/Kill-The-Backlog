import type { Sandbox } from "e2b";

import type { SandboxProcessPortReadyResult } from "#lib/.server/sandbox-service/readiness.js";

import { waitForSandboxProcessPortReady } from "#lib/.server/sandbox-service/readiness.js";
import { PREVIEW_PORT, PREVIEW_STATUS } from "#lib/session-preview.js";

const PREVIEW_HEALTH_POLL_INTERVAL_MS = 2_000;
const PREVIEW_START_TIMEOUT_MS = 5 * 60_000;

export type PreviewReadyResult =
  SandboxProcessPortReadyResult<PreviewReadinessFailureStatus>;

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
  return waitForSandboxProcessPortReady({
    pid,
    pollIntervalMs: PREVIEW_HEALTH_POLL_INTERVAL_MS,
    port: PREVIEW_PORT,
    processExitedResult: {
      message: "Preview script exited before becoming ready",
      type: PREVIEW_STATUS.crashed,
    },
    sandbox,
    startupTimeoutMs: PREVIEW_START_TIMEOUT_MS,
    timedOutResult: {
      message: "Preview script did not become ready before the startup timeout",
      type: PREVIEW_STATUS.unhealthy,
    },
  });
}
