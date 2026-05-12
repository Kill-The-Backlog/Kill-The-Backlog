import type { Sandbox } from "e2b";

import { setTimeout as sleep } from "node:timers/promises";

export type SandboxProcessPortReadyResult<TFailureStatus extends string> =
  | SandboxProcessPortReadyFailure<TFailureStatus>
  | { type: "ready" };

type SandboxProcessPortReadyFailure<TFailureStatus extends string> = {
  message: string;
  type: TFailureStatus;
};

export async function isSandboxPortHealthy({
  port,
  sandbox,
}: {
  port: number;
  sandbox: Sandbox;
}): Promise<boolean> {
  try {
    await sandbox.commands.run(
      `curl -fsS http://127.0.0.1:${port}/ >/dev/null`,
      { timeoutMs: 5_000 },
    );
    return true;
  } catch {
    return false;
  }
}

export async function waitForSandboxProcessPortReady<TFailureStatus extends string>({
  pid,
  pollIntervalMs,
  port,
  processExitedResult,
  sandbox,
  startupTimeoutMs,
  timedOutResult,
}: {
  pid: number;
  pollIntervalMs: number;
  port: number;
  processExitedResult: SandboxProcessPortReadyFailure<TFailureStatus>;
  sandbox: Sandbox;
  startupTimeoutMs: number;
  timedOutResult: SandboxProcessPortReadyFailure<TFailureStatus>;
}): Promise<SandboxProcessPortReadyResult<TFailureStatus>> {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    if (!(await isProcessRunning(sandbox, pid))) {
      return processExitedResult;
    }
    if (await isSandboxPortHealthy({ port, sandbox })) {
      return { type: "ready" };
    }
    await sleep(pollIntervalMs);
  }

  return timedOutResult;
}

async function isProcessRunning(sandbox: Sandbox, pid: number): Promise<boolean> {
  const processes = await sandbox.commands.list();
  return processes.some((process) => process.pid === pid);
}
