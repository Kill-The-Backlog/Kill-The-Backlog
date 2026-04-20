import type { DB } from "@ktb/db/client";
import type { Transaction } from "@ktb/db/kysely-types";
import type { Message, Part } from "@opencode-ai/sdk/v2";

import { appendToJSONBField } from "@ktb/db/kysely-helpers";

import type { db } from "#lib/.server/clients/db.js";

export type Exec = Transaction<DB> | typeof db;

export async function appendPartDelta(
  exec: Exec,
  { delta, field, partId }: { delta: string; field: string; partId: string },
): Promise<void> {
  await exec
    .updateTable("SessionMessagePart")
    .set((eb) => ({
      data: appendToJSONBField(eb.ref("data"), field, delta),
      updatedAt: new Date(),
    }))
    .where("opencodeId", "=", partId)
    .execute();
}

export async function upsertMessage(
  exec: Exec,
  { message, sessionId }: { message: Message; sessionId: string },
): Promise<void> {
  await exec
    .insertInto("SessionMessage")
    .values({
      id: crypto.randomUUID(),
      opencodeCreatedAt: new Date(message.time.created),
      opencodeId: message.id,
      role: message.role,
      sessionId,
      updatedAt: new Date(),
    })
    .onConflict((oc) =>
      oc
        .column("opencodeId")
        .doUpdateSet({ role: message.role, updatedAt: new Date() }),
    )
    .execute();
}

export async function upsertPart(exec: Exec, part: Part): Promise<void> {
  await exec
    .insertInto("SessionMessagePart")
    .values((eb) => ({
      data: part,
      id: crypto.randomUUID(),
      messageId: eb
        .selectFrom("SessionMessage")
        .select("id")
        .where("opencodeId", "=", part.messageID),
      opencodeId: part.id,
      type: part.type,
      updatedAt: new Date(),
    }))
    .onConflict((oc) =>
      oc
        .column("opencodeId")
        .doUpdateSet({ data: part, type: part.type, updatedAt: new Date() }),
    )
    .execute();
}
