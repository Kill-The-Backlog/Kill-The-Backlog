import type { Updateable } from "@ktb/db/kysely-types";
import type { Session } from "@ktb/db/types";
import type { Event, EventSessionError, Part } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";

import { appendToJSONBField } from "@ktb/db/kysely-helpers";

import { db } from "#lib/.server/clients/db.js";

export type EventContext = {
  job: Job;
  sessionId: string;
};

export async function handleEvent(event: Event, ctx: EventContext) {
  const { job, sessionId } = ctx;

  switch (event.type) {
    case "message.part.delta": {
      const { delta, field, partID } = event.properties;
      await db
        .updateTable("SessionMessagePart")
        .set((eb) => ({
          data: appendToJSONBField(eb.ref("data"), field, delta),
          updatedAt: new Date(),
        }))
        .where("opencodeId", "=", partID)
        .execute();
      return;
    }

    case "message.part.removed": {
      await db
        .deleteFrom("SessionMessagePart")
        .where("opencodeId", "=", event.properties.partID)
        .execute();
      return;
    }

    case "message.part.updated": {
      const { part } = event.properties;
      await queryUpsertPart({
        data: part,
        opencodeId: part.id,
        opencodeMessageId: part.messageID,
        type: part.type,
      });
      return;
    }

    case "message.removed": {
      await db
        .deleteFrom("SessionMessage")
        .where("opencodeId", "=", event.properties.messageID)
        .execute();
      return;
    }

    case "message.updated": {
      const { info } = event.properties;
      await queryUpsertMessage({
        opencodeId: info.id,
        role: info.role,
        sessionId,
      });
      return;
    }

    case "session.error": {
      await queryPatchSession(sessionId, {
        errorMessage: extractErrorMessage(event),
      });
      return;
    }

    case "session.idle":
      // Idle transitions are handled by the event pump.
      return;

    case "session.updated": {
      const { summary } = event.properties.info;
      if (!summary) return;
      await queryPatchSession(sessionId, { summary });
      return;
    }

    case "todo.updated": {
      await queryPatchSession(sessionId, { todos: event.properties.todos });
      return;
    }

    default:
      await job.log(`Unhandled event: ${event.type}`);
      return;
  }
}

function extractErrorMessage(event: EventSessionError): string {
  const { error } = event.properties;
  if (!error) return "Unknown error";
  const { message } = error.data;
  return typeof message === "string" ? `${error.name}: ${message}` : error.name;
}

async function queryPatchSession(
  sessionId: string,
  values: Updateable<Session>,
): Promise<void> {
  await db
    .updateTable("Session")
    .set({ ...values, updatedAt: new Date() })
    .where("id", "=", sessionId)
    .execute();
}

async function queryUpsertMessage({
  opencodeId,
  role,
  sessionId,
}: {
  opencodeId: string;
  role: string;
  sessionId: string;
}): Promise<void> {
  await db
    .insertInto("SessionMessage")
    .values({
      id: crypto.randomUUID(),
      opencodeId,
      role,
      sessionId,
      updatedAt: new Date(),
    })
    .onConflict((oc) =>
      oc.column("opencodeId").doUpdateSet({ role, updatedAt: new Date() }),
    )
    .execute();
}

async function queryUpsertPart({
  data,
  opencodeId,
  opencodeMessageId,
  type,
}: {
  data: Part;
  opencodeId: string;
  opencodeMessageId: string;
  type: string;
}): Promise<void> {
  await db
    .insertInto("SessionMessagePart")
    .values((eb) => ({
      data,
      id: crypto.randomUUID(),
      messageId: eb
        .selectFrom("SessionMessage")
        .select("id")
        .where("opencodeId", "=", opencodeMessageId),
      opencodeId,
      type,
      updatedAt: new Date(),
    }))
    .onConflict((oc) =>
      oc
        .column("opencodeId")
        .doUpdateSet({ data, type, updatedAt: new Date() }),
    )
    .execute();
}
