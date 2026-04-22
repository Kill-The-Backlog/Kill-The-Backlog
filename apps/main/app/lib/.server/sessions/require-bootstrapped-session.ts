import invariant from "tiny-invariant";

import { db } from "#lib/.server/clients/db.js";

// A session that has finished bootstrapping: both the E2B sandbox and
// the opencode session exist. All callers that talk to the sandbox (send
// prompt, event pump) need these IDs to be present, and crashing with a
// clear message is the right behavior if they aren't — every entry point
// that reaches this code path is only hit after the bootstrapper has
// recorded both IDs. `repoFullName` and `userId` come along so the pump
// can derive the sandbox clone path and resolve the owner's GitHub OAuth
// token for commit / push / PR work without a second query.
export type BootstrappedSession = {
  e2bSandboxId: string;
  opencodeSessionId: string;
  prNumber: null | number;
  repoFullName: string;
  userId: number;
};

export async function requireBootstrappedSession(
  sessionId: string,
): Promise<BootstrappedSession> {
  const row = await db
    .selectFrom("Session")
    .select([
      "e2bSandboxId",
      "opencodeSessionId",
      "prNumber",
      "repoFullName",
      "userId",
    ])
    .where("id", "=", sessionId)
    .executeTakeFirst();

  invariant(row, `Session not found: ${sessionId}`);
  invariant(
    row.e2bSandboxId && row.opencodeSessionId,
    `Session ${sessionId} has not finished bootstrapping`,
  );

  return {
    e2bSandboxId: row.e2bSandboxId,
    opencodeSessionId: row.opencodeSessionId,
    prNumber: row.prNumber,
    repoFullName: row.repoFullName,
    userId: row.userId,
  };
}
