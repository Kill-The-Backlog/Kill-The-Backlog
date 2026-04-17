import type { SandboxStatus } from "@ktb/db/types";

import { db } from "#lib/.server/clients/db.js";

// Sets the sandbox lifecycle status and optionally writes or clears errorMessage.
// Shared between the supervisor entrypoint and ensure-sandbox because both sites
// move the session through the sandbox-status state machine.
export async function queryMarkSandboxStatus({
  errorMessage,
  sandboxStatus,
  sessionId,
}: {
  errorMessage?: null | string;
  sandboxStatus: SandboxStatus;
  sessionId: string;
}): Promise<void> {
  await db
    .updateTable("Session")
    .set({
      sandboxStatus,
      updatedAt: new Date(),
      ...(errorMessage !== undefined && { errorMessage }),
    })
    .where("id", "=", sessionId)
    .execute();
}
