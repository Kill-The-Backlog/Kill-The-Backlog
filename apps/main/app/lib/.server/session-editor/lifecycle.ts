import type { Job } from "bullmq";
import type { CommandHandle, Sandbox } from "e2b";

import { quote } from "shell-quote";

import type { EditorFailureStatus } from "#lib/session-editor.js";

import { formatError } from "#lib/.server/format-error.js";
import {
  disconnectSandboxCommandHandleSafely,
  stopSandboxCommandHandleSafely,
} from "#lib/.server/sandbox-service/command-handle.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { EDITOR_PORT, EDITOR_STATUS } from "#lib/session-editor.js";

import { getSessionEditorPassword } from "./password.js";
import { waitForEditorReady } from "./readiness.js";

type SessionEditorParams = {
  clonePath: string;
  job: Job;
  sandbox: Sandbox;
  sessionId: string;
};

const EDITOR_LOG_DIR = "/home/user/.ktb";
const EDITOR_LOG_PATH = `${EDITOR_LOG_DIR}/code-server.log`;

export async function startSessionEditor({
  clonePath,
  job,
  sandbox,
  sessionId,
}: SessionEditorParams): Promise<void> {
  await markEditorStarting(sessionId);

  let handle: CommandHandle | undefined;
  try {
    handle = await sandbox.commands.run(
      buildCodeServerStartupCommand(clonePath),
      {
        background: true,
        cwd: clonePath,
        envs: {
          PASSWORD: getSessionEditorPassword(sessionId),
        },
        timeoutMs: 0,
      },
    );

    await job.log(
      `[editor] started code-server pid=${handle.pid} log=${EDITOR_LOG_PATH}`,
    );

    const result = await waitForEditorReady({ pid: handle.pid, sandbox });
    if (result.type !== "ready") {
      await handleEditorNotReady({
        handle,
        job,
        message: result.message,
        sessionId,
        status: result.type,
      });
      return;
    }

    await markEditorRunning(sessionId);
  } catch (error) {
    const message = formatError(error);
    if (handle !== undefined) {
      await stopSandboxCommandHandleSafely({
        handle,
        job,
        logPrefix: "editor",
        processName: "code-server",
      });
    }

    await markEditorFailed({
      message,
      sessionId,
      status: EDITOR_STATUS.failed,
    });
  } finally {
    if (handle !== undefined) {
      await disconnectSandboxCommandHandleSafely({
        handle,
        job,
        logPrefix: "editor",
        processName: "code-server",
      });
    }
  }
}

function buildCodeServerCommand(clonePath: string): string {
  return [
    "exec code-server",
    quote([clonePath]),
    `--bind-addr 0.0.0.0:${EDITOR_PORT}`,
    "--auth password",
    "--disable-telemetry",
    "--disable-update-check",
  ].join(" ");
}

function buildCodeServerStartupCommand(clonePath: string): string {
  const logDir = quote([EDITOR_LOG_DIR]);
  const logPath = quote([EDITOR_LOG_PATH]);
  const appendToLog = `>> ${logPath} 2>&1`;

  return [
    `mkdir -p ${logDir}`,
    `printf '\\n[%s] starting code-server on port ${EDITOR_PORT}\\n' "$(date -Is)" ${appendToLog}`,
    `${buildCodeServerCommand(clonePath)} ${appendToLog}`,
  ].join(" && ");
}

async function handleEditorNotReady({
  handle,
  job,
  message,
  sessionId,
  status,
}: {
  handle: CommandHandle;
  job: Job;
  message: string;
  sessionId: string;
  status: EditorFailureStatus;
}): Promise<void> {
  if (status !== EDITOR_STATUS.crashed) {
    await stopSandboxCommandHandleSafely({
      handle,
      job,
      logPrefix: "editor",
      processName: "code-server",
    });
  }

  await markEditorFailed({
    message,
    sessionId,
    status,
  });
}

async function markEditorFailed({
  message,
  sessionId,
  status,
}: {
  message: string;
  sessionId: string;
  status: EditorFailureStatus;
}): Promise<void> {
  await queryPatchSession(sessionId, {
    editorErrorMessage: message,
    editorStatus: status,
  });
}

async function markEditorRunning(sessionId: string): Promise<void> {
  await queryPatchSession(sessionId, {
    editorErrorMessage: null,
    editorStatus: EDITOR_STATUS.running,
  });
}

async function markEditorStarting(sessionId: string): Promise<void> {
  await queryPatchSession(sessionId, {
    editorErrorMessage: null,
    editorStatus: EDITOR_STATUS.starting,
  });
}
