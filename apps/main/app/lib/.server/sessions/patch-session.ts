import type { Updateable } from "@ktb/db/kysely-types";
import type { Session } from "@ktb/db/types";

import { db } from "#lib/.server/clients/db.js";

export async function queryPatchSession(
  sessionId: string,
  values: Updateable<Session>,
): Promise<void> {
  await db
    .updateTable("Session")
    .set({ ...values, updatedAt: new Date() })
    .where("id", "=", sessionId)
    .execute();
}
