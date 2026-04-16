import type {
  Event,
  EventSessionError,
  OpencodeClient,
  Part,
} from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";

import { appendToJSONBField } from "@ktb/db/kysely-helpers";

import { db } from "#lib/.server/clients/db.js";

const EVENTS_DRAIN_TIMEOUT_MS = 10_000;

type EventContext = { job: Job; sessionId: string };

export function createEventsSubscription({
  client,
  job,
  sessionId,
}: {
  client: OpencodeClient;
  job: Job;
  sessionId: string;
}) {
  const ctx: EventContext = { job, sessionId };
  const abortController = new AbortController();
  const promise = subscribeToEvents(client, ctx, abortController.signal);

  return {
    async drain() {
      const timeout = setTimeout(() => {
        abortController.abort();
      }, EVENTS_DRAIN_TIMEOUT_MS);

      try {
        await promise;
      } catch (error) {
        await job.log(`Events subscription error: ${String(error)}`);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function extractErrorMessage(event: EventSessionError): string {
  const { error } = event.properties;
  if (!error) return "Unknown error";
  const { message } = error.data;
  return typeof message === "string" ? `${error.name}: ${message}` : error.name;
}

async function handleEvent(event: Event, { job, sessionId }: EventContext) {
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
      await db
        .updateTable("Session")
        .set({
          errorMessage: extractErrorMessage(event),
          updatedAt: new Date(),
        })
        .where("id", "=", sessionId)
        .execute();
      return;
    }

    case "session.idle":
      return;

    case "session.updated": {
      const { summary } = event.properties.info;
      if (!summary) return;
      await db
        .updateTable("Session")
        .set({ summary, updatedAt: new Date() })
        .where("id", "=", sessionId)
        .execute();
      return;
    }

    case "todo.updated": {
      await db
        .updateTable("Session")
        .set({ todos: event.properties.todos, updatedAt: new Date() })
        .where("id", "=", sessionId)
        .execute();
      return;
    }

    default:
      await job.log(`Unhandled event: ${event.type}`);
      return;
  }
}

async function queryUpsertMessage({
  opencodeId,
  role,
  sessionId,
}: {
  opencodeId: string;
  role: string;
  sessionId: string;
}) {
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
}) {
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

async function subscribeToEvents(
  client: OpencodeClient,
  ctx: EventContext,
  signal: AbortSignal,
) {
  const { stream } = await client.event.subscribe();

  const abortStream = () => {
    void stream.throw(new Error("Subscription aborted"));
  };
  signal.addEventListener("abort", abortStream);

  try {
    for await (const event of stream) {
      await handleEvent(event, ctx);

      if (event.type === "session.idle") {
        return;
      }
    }
  } finally {
    signal.removeEventListener("abort", abortStream);
  }
}
