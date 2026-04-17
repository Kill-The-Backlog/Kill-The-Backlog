import type { Selectable } from "@ktb/db/kysely-types";
import type { Session } from "@ktb/db/types";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";

import { createOpencodeClient } from "@opencode-ai/sdk/v2";
import { Sandbox } from "e2b";
import invariant from "tiny-invariant";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";

import { formatError } from "./format-error.js";
import {
  startOpencodeServer,
  waitForOpencodeHealth,
} from "./opencode-server.js";
import { queryMarkSandboxStatus } from "./sandbox-status.js";

export type EnsuredSandbox = {
  client: OpencodeClient;
  opencodeSessionId: string;
  sandbox: Sandbox;
};

type SessionRow = Pick<
  Selectable<Session>,
  "e2bSandboxId" | "opencodeSessionId" | "sandboxStatus"
>;

// Given a session's current sandboxStatus, produces a live sandbox + opencode
// client ready to accept commands.
//   - paused | ready                     -> Sandbox.connect (auto-resume /
//                                           reconnect); falls back to fresh
//                                           provision if connect fails.
//   - provisioning | pausing | resuming  -> treated as crash mid-transition;
//                                           re-provision (we can't safely
//                                           resume from an unknown state).
//   - anything else                      -> fresh provision.
//
// Errors are thrown unchanged; the supervisor is the single writer of
// sandboxStatus='errored'.
export async function ensureSandbox({
  job,
  sessionId,
}: {
  job: Job;
  sessionId: string;
}): Promise<EnsuredSandbox> {
  const session = await loadSession(sessionId);

  const resumed = await tryResume({ job, session, sessionId });
  if (resumed) return resumed;

  return provisionSandbox({ job, sessionId });
}

async function killSandboxSafely(
  sandbox: Sandbox,
  job: Job,
  context: string,
): Promise<void> {
  try {
    await sandbox.kill();
  } catch (killError) {
    await job.log(
      `Failed to kill sandbox ${sandbox.sandboxId} during ${context}: ${formatError(killError)}`,
    );
  }
}

async function loadSession(sessionId: string): Promise<SessionRow> {
  const session = await db
    .selectFrom("Session")
    .select(["e2bSandboxId", "opencodeSessionId", "sandboxStatus"])
    .where("id", "=", sessionId)
    .executeTakeFirst();
  invariant(session, `Session not found: ${sessionId}`);
  return session;
}

// Creates a fresh E2B sandbox, starts opencode inside it, creates an opencode
// session, and persists the IDs. Sets status=provisioning on entry and
// status=ready on success. On failure, kills the sandbox and rethrows; the
// supervisor marks the session errored.
async function provisionSandbox({
  job,
  sessionId,
}: {
  job: Job;
  sessionId: string;
}): Promise<EnsuredSandbox> {
  await queryMarkSandboxStatus({
    errorMessage: null,
    sandboxStatus: "provisioning",
    sessionId,
  });

  let sandbox: Sandbox | undefined;
  try {
    sandbox = await Sandbox.create("opencode", {
      apiKey: serverEnv.E2B_API_KEY,
      lifecycle: {
        onTimeout: "pause",
      },
    });

    // Record the sandbox ID as soon as it exists so observers can see what
    // we're provisioning; opencodeSessionId follows once the SDK returns it.
    await queryRecordSandboxIds({ e2bSandboxId: sandbox.sandboxId, sessionId });

    const baseUrl = await startOpencodeServer(sandbox, job);
    const client = createOpencodeClient({ baseUrl });

    const opencodeSession = await client.session.create();
    if (opencodeSession.error) {
      throw new Error("Failed to create opencode session", {
        cause: opencodeSession.error,
      });
    }

    await queryRecordSandboxIds({
      opencodeSessionId: opencodeSession.data.id,
      sessionId,
    });
    await queryMarkSandboxStatus({ sandboxStatus: "ready", sessionId });

    return { client, opencodeSessionId: opencodeSession.data.id, sandbox };
  } catch (error) {
    if (sandbox) await killSandboxSafely(sandbox, job, "provision cleanup");
    throw error;
  }
}

// Writes the provided identifier(s) on the session. Undefined columns are
// left untouched.
async function queryRecordSandboxIds({
  e2bSandboxId,
  opencodeSessionId,
  sessionId,
}: {
  e2bSandboxId?: string;
  opencodeSessionId?: string;
  sessionId: string;
}): Promise<void> {
  await db
    .updateTable("Session")
    .set({
      updatedAt: new Date(),
      ...(e2bSandboxId !== undefined && { e2bSandboxId }),
      ...(opencodeSessionId !== undefined && { opencodeSessionId }),
    })
    .where("id", "=", sessionId)
    .execute();
}

async function resumeSandbox({
  e2bSandboxId,
  job,
  opencodeSessionId,
  sessionId,
}: {
  e2bSandboxId: string;
  job: Job;
  opencodeSessionId: string;
  sessionId: string;
}): Promise<EnsuredSandbox> {
  await queryMarkSandboxStatus({ sandboxStatus: "resuming", sessionId });

  const resumeStartMs = performance.now();
  const sandbox = await Sandbox.connect(e2bSandboxId, {
    apiKey: serverEnv.E2B_API_KEY,
  });
  const connectElapsedMs = Math.round(performance.now() - resumeStartMs);
  await job.log(`Sandbox.connect returned in ${connectElapsedMs}ms`);

  try {
    const baseUrl = await waitForOpencodeHealth(sandbox, job);
    const client = createOpencodeClient({ baseUrl });

    await queryMarkSandboxStatus({
      errorMessage: null,
      sandboxStatus: "ready",
      sessionId,
    });

    return { client, opencodeSessionId, sandbox };
  } catch (error) {
    // Opencode didn't come back healthy inside the resumed sandbox. Kill it so
    // we don't orphan an E2B sandbox when the caller falls back to provision.
    await killSandboxSafely(sandbox, job, "resume cleanup");
    throw error;
  }
}

// Attempts to resume the session's existing sandbox. Returns null if we should
// provision a fresh one instead; the reason is logged.
async function tryResume({
  job,
  session,
  sessionId,
}: {
  job: Job;
  session: SessionRow;
  sessionId: string;
}): Promise<EnsuredSandbox | null> {
  const { e2bSandboxId, opencodeSessionId, sandboxStatus } = session;

  const fallThrough = async (reason: string): Promise<null> => {
    await job.log(`Provisioning fresh sandbox for ${sessionId}: ${reason}`);
    return null;
  };

  if (sandboxStatus === "paused" || sandboxStatus === "ready") {
    if (!e2bSandboxId || !opencodeSessionId) {
      return fallThrough(
        `status=${sandboxStatus} but missing sandbox/opencode IDs`,
      );
    }

    try {
      return await resumeSandbox({
        e2bSandboxId,
        job,
        opencodeSessionId,
        sessionId,
      });
    } catch (error) {
      return fallThrough(`resume failed: ${formatError(error)}`);
    }
  }

  if (
    sandboxStatus === "provisioning" ||
    sandboxStatus === "pausing" ||
    sandboxStatus === "resuming"
  ) {
    return fallThrough(`mid-transition crash (status=${sandboxStatus})`);
  }

  return fallThrough(`status=${sandboxStatus}`);
}
