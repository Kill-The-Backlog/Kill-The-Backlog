import type { Job } from "bullmq";
import type { CommandHandle } from "e2b";

import { formatError } from "#lib/.server/format-error.js";

export type SandboxCommandStopResult = {
  remainingProcessId: null | number;
  stopped: boolean;
};

export const STOPPED_SANDBOX_COMMAND_PROCESS: SandboxCommandStopResult = {
  remainingProcessId: null,
  stopped: true,
};

export async function disconnectSandboxCommandHandleSafely({
  handle,
  job,
  logPrefix,
  processName,
}: {
  handle: CommandHandle;
  job: Job;
  logPrefix: string;
  processName: string;
}): Promise<void> {
  try {
    await handle.disconnect();
  } catch (error) {
    await job.log(
      `[${logPrefix}] failed to detach from ${processName} process ${handle.pid}: ${formatError(error)}`,
    );
  }
}

export async function stopSandboxCommandHandleSafely({
  handle,
  job,
  logPrefix,
  processName,
}: {
  handle: CommandHandle;
  job: Job;
  logPrefix: string;
  processName: string;
}): Promise<SandboxCommandStopResult> {
  try {
    const killed = await handle.kill();
    if (killed) return STOPPED_SANDBOX_COMMAND_PROCESS;

    await job.log(
      `[${logPrefix}] ${processName} process ${handle.pid} was not killed`,
    );
    return { remainingProcessId: handle.pid, stopped: false };
  } catch (error) {
    await job.log(
      `[${logPrefix}] failed to kill ${processName} process ${handle.pid}: ${formatError(error)}`,
    );
    return { remainingProcessId: handle.pid, stopped: false };
  }
}
