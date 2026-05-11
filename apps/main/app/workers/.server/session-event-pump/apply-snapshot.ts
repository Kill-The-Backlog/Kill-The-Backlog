import type { SessionMessagesResponse } from "@opencode-ai/sdk/v2";

import { db } from "#lib/.server/clients/db.js";

import { upsertMessage, upsertPart } from "./messages-db.js";

// Applies a full `/session/:id/message` snapshot to our DB. Upserts every
// message and part, then reconciles anything that disappeared upstream:
// messages no longer in the snapshot are deleted (cascading their parts),
// and parts whose message survives but whose own id was dropped are deleted
// too. Ordering matters: upserts happen BEFORE deletes so a newly-inserted
// row in this snapshot can't be clobbered by a prior row's cascade.
export async function applySnapshot({
  messages,
  sessionId,
}: {
  messages: SessionMessagesResponse;
  sessionId: string;
}): Promise<void> {
  const messageOpencodeIds = messages.map((m) => m.info.id);
  const partOpencodeIds = messages.flatMap((m) => m.parts.map((p) => p.id));

  await db.transaction().execute(async (tx) => {
    for (const { info, parts } of messages) {
      await upsertMessage(tx, { message: info, sessionId });
      for (const part of parts) {
        await upsertPart(tx, part);
      }
    }

    await tx
      .deleteFrom("SessionMessage")
      .where("sessionId", "=", sessionId)
      .$if(messageOpencodeIds.length > 0, (qb) =>
        qb.where("opencodeId", "not in", messageOpencodeIds),
      )
      .execute();

    // Only runs when the snapshot has parts — with zero parts, the message
    // delete above already cascaded everything away via the "delete all
    // messages for this session" branch.
    if (partOpencodeIds.length > 0) {
      await tx
        .deleteFrom("SessionMessagePart")
        .where(
          "messageId",
          "in",
          tx
            .selectFrom("SessionMessage")
            .select("id")
            .where("sessionId", "=", sessionId),
        )
        .where("opencodeId", "not in", partOpencodeIds)
        .execute();
    }
  });
}
