import type { Sandbox } from "e2b";

import type { SandboxProcessPortReadyResult } from "#lib/.server/sandbox-service/readiness.js";

import { waitForSandboxProcessPortReady } from "#lib/.server/sandbox-service/readiness.js";
import { EDITOR_PORT, EDITOR_STATUS } from "#lib/session-editor.js";

const EDITOR_HEALTH_POLL_INTERVAL_MS = 500;
const EDITOR_START_TIMEOUT_MS = 30_000;

export type EditorReadyResult =
  SandboxProcessPortReadyResult<EditorReadinessFailureStatus>;

type EditorReadinessFailureStatus =
  | typeof EDITOR_STATUS.crashed
  | typeof EDITOR_STATUS.unhealthy;

export async function waitForEditorReady({
  pid,
  sandbox,
}: {
  pid: number;
  sandbox: Sandbox;
}): Promise<EditorReadyResult> {
  return waitForSandboxProcessPortReady({
    pid,
    pollIntervalMs: EDITOR_HEALTH_POLL_INTERVAL_MS,
    port: EDITOR_PORT,
    processExitedResult: {
      message: "VS Code exited before becoming ready",
      type: EDITOR_STATUS.crashed,
    },
    sandbox,
    startupTimeoutMs: EDITOR_START_TIMEOUT_MS,
    timedOutResult: {
      message: "VS Code did not become ready before the startup timeout",
      type: EDITOR_STATUS.unhealthy,
    },
  });
}
