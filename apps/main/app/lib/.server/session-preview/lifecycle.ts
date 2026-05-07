import type { Job } from "bullmq";
import type { CommandHandle, Sandbox } from "e2b";

import type { PreviewFailureStatus } from "#lib/session-preview.js";

import { db } from "#lib/.server/clients/db.js";
import { formatError } from "#lib/.server/format-error.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import {
  PREVIEW_PORT,
  PREVIEW_SCRIPT_PATH,
  PREVIEW_STATUS,
  previewBaseUrl,
} from "#lib/session-preview.js";

import type { PreviewLogger } from "./logger.js";
import type { PreviewReadyResult } from "./readiness.js";

import { createPreviewLogger } from "./logger.js";
import { waitForPreviewReady } from "./readiness.js";

type PreviewStopResult = {
  previewProcessId: null | number;
  stopped: boolean;
};

type SessionPreviewParams = {
  clonePath: string;
  job: Job;
  sandbox: Sandbox;
  sessionId: string;
};

const STOPPED_PREVIEW_PROCESS: PreviewStopResult = {
  previewProcessId: null,
  stopped: true,
};

export async function restartSessionPreview({
  clonePath,
  job,
  sandbox,
  sessionId,
}: SessionPreviewParams): Promise<void> {
  const previewState = await db
    .selectFrom("Session")
    .select(["previewProcessId"])
    .where("id", "=", sessionId)
    .executeTakeFirst();
  const stopResult = await stopPreviewProcess({
    job,
    pid: previewState?.previewProcessId ?? null,
    sandbox,
    sessionId,
  });
  if (!stopResult.stopped) {
    await queryPatchSession(sessionId, {
      previewErrorMessage: "Failed to stop existing preview process",
      previewProcessId: stopResult.previewProcessId,
      previewStatus: PREVIEW_STATUS.failed,
    });
    return;
  }

  await startSessionPreview({ clonePath, job, sandbox, sessionId });
}

async function disconnectPreviewHandleSafely({
  handle,
  job,
}: {
  handle: CommandHandle;
  job: Job;
}): Promise<void> {
  try {
    await handle.disconnect();
  } catch (error) {
    await job.log(
      `[preview] failed to detach from preview process ${handle.pid}: ${formatError(error)}`,
    );
  }
}

async function handlePreviewNotReady({
  handle,
  job,
  previewLogger,
  result,
  sessionId,
}: {
  handle: CommandHandle;
  job: Job;
  previewLogger: PreviewLogger;
  result: Exclude<PreviewReadyResult, { type: "ready" }>;
  sessionId: string;
}): Promise<void> {
  const stopResult =
    result.type === PREVIEW_STATUS.crashed
      ? STOPPED_PREVIEW_PROCESS
      : await stopPreviewHandleSafely({ handle, job });

  await markPreviewFailed({
    message: result.message,
    previewLogger,
    previewProcessId: stopResult.previewProcessId,
    sessionId,
    status: result.type,
  });
}

async function markPreviewFailed({
  message,
  previewLogger,
  previewProcessId,
  sessionId,
  status,
}: {
  message: string;
  previewLogger: PreviewLogger;
  previewProcessId: null | number;
  sessionId: string;
  status: PreviewFailureStatus;
}): Promise<void> {
  await queryPatchSession(sessionId, {
    previewErrorMessage: message,
    previewProcessId,
    previewStatus: status,
  });
  await previewLogger.system(message);
}

async function markPreviewNotConfigured({
  job,
  sessionId,
}: {
  job: Job;
  sessionId: string;
}): Promise<void> {
  await queryPatchSession(sessionId, {
    previewErrorMessage: null,
    previewLogs: null,
    previewProcessId: null,
    previewStatus: PREVIEW_STATUS.notConfigured,
  });
  await job.log(`[preview] not configured: ${PREVIEW_SCRIPT_PATH} not found`);
}

async function markPreviewRunning({
  previewLogger,
  sandboxId,
  sessionId,
}: {
  previewLogger: PreviewLogger;
  sandboxId: string;
  sessionId: string;
}): Promise<void> {
  const previewUrl = previewBaseUrl(sandboxId);

  await queryPatchSession(sessionId, {
    previewErrorMessage: null,
    previewStatus: PREVIEW_STATUS.running,
  });
  await previewLogger.system(`Preview ready at ${previewUrl}`);
}

async function markPreviewStarting(sessionId: string): Promise<void> {
  await queryPatchSession(sessionId, {
    previewErrorMessage: null,
    previewLogs: null,
    previewProcessId: null,
    previewStatus: PREVIEW_STATUS.starting,
  });
}

async function startSessionPreview({
  clonePath,
  job,
  sandbox,
  sessionId,
}: SessionPreviewParams): Promise<void> {
  const scriptPath = `${clonePath}/${PREVIEW_SCRIPT_PATH}`;
  const scriptExists = await sandbox.files.exists(scriptPath);
  if (!scriptExists) {
    await markPreviewNotConfigured({ job, sessionId });
    return;
  }

  await markPreviewStarting(sessionId);
  const previewLogger = createPreviewLogger({ job, sessionId });
  await previewLogger.system(
    `Starting ${PREVIEW_SCRIPT_PATH} on port ${PREVIEW_PORT}`,
  );

  let handle: CommandHandle | undefined;
  try {
    handle = await sandbox.commands.run(`bash ${PREVIEW_SCRIPT_PATH}`, {
      background: true,
      cwd: clonePath,
      envs: {
        KTB_PREVIEW_PORT: String(PREVIEW_PORT),
      },
      onStderr: (data) => {
        previewLogger.output("stderr", data);
      },
      onStdout: (data) => {
        previewLogger.output("stdout", data);
      },
    });

    await queryPatchSession(sessionId, {
      previewProcessId: handle.pid,
    });

    const result = await waitForPreviewReady({ pid: handle.pid, sandbox });

    if (result.type !== "ready") {
      await handlePreviewNotReady({
        handle,
        job,
        previewLogger,
        result,
        sessionId,
      });
      return;
    }

    await markPreviewRunning({
      previewLogger,
      sandboxId: sandbox.sandboxId,
      sessionId,
    });
  } catch (error) {
    const message = formatError(error);
    const previewProcessId =
      handle === undefined
        ? null
        : (await stopPreviewHandleSafely({ handle, job })).previewProcessId;

    await markPreviewFailed({
      message,
      previewLogger,
      previewProcessId,
      sessionId,
      status: PREVIEW_STATUS.failed,
    });
  } finally {
    if (handle !== undefined) {
      await disconnectPreviewHandleSafely({ handle, job });
    }
    await previewLogger.flush();
  }
}

async function stopPreviewHandleSafely({
  handle,
  job,
}: {
  handle: CommandHandle;
  job: Job;
}): Promise<PreviewStopResult> {
  try {
    const killed = await handle.kill();
    if (killed) return STOPPED_PREVIEW_PROCESS;

    await job.log(`[preview] preview process ${handle.pid} was not killed`);
    return { previewProcessId: handle.pid, stopped: false };
  } catch (error) {
    await job.log(
      `[preview] failed to kill preview process ${handle.pid}: ${formatError(error)}`,
    );
    return { previewProcessId: handle.pid, stopped: false };
  }
}

async function stopPreviewProcess({
  job,
  pid,
  sandbox,
  sessionId,
}: {
  job: Job;
  pid: null | number;
  sandbox: Sandbox;
  sessionId: string;
}): Promise<PreviewStopResult> {
  if (pid === null) return STOPPED_PREVIEW_PROCESS;

  const previewLogger = createPreviewLogger({ job, sessionId });
  try {
    const killed = await sandbox.commands.kill(pid);
    const message = killed
      ? `Killed preview process ${pid}`
      : `Preview process ${pid} was not running`;
    await previewLogger.system(message);
    return STOPPED_PREVIEW_PROCESS;
  } catch (error) {
    const message = `Failed to kill preview process ${pid}: ${formatError(error)}`;
    await previewLogger.system(message);
    return { previewProcessId: pid, stopped: false };
  }
}
