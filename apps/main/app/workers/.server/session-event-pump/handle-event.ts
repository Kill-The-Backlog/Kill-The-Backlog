import type { Event, EventSessionError } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";

import { db } from "#lib/.server/clients/db.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";

import { appendPartDelta, upsertMessage, upsertPart } from "./messages-db.js";

export async function handleEvent(
  event: Event,
  { job, sessionId }: { job: Job; sessionId: string },
) {
  switch (event.type) {
    case "message.part.delta": {
      const { delta, field, partID } = event.properties;
      await appendPartDelta(db, { delta, field, partId: partID });
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
      await upsertPart(db, event.properties.part);
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
      await upsertMessage(db, { message: event.properties.info, sessionId });
      return;
    }

    case "session.error": {
      await queryPatchSession(sessionId, {
        errorMessage: extractErrorMessage(event),
      });
      return;
    }

    case "session.idle":
    case "session.status":
      // `session.status` drives the pump's idle timer (see event-pump.ts);
      // `session.idle` duplicates the `status.type === "idle"` signal and
      // doesn't need separate handling. Swallow both here so they don't
      // fall through to the `Unhandled event` default log.
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
