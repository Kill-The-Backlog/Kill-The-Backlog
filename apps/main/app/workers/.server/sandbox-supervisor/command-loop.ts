import type { SessionCommandStatus } from "@ktb/db/types";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";

import { setTimeout as sleep } from "node:timers/promises";

import { db } from "#lib/.server/clients/db.js";

import type { IdleTracker } from "./idle-timer.js";
import type { NotifySubscription } from "./notify.js";

import { formatError } from "./format-error.js";
import { handleSendPromptCommand } from "./handle-send-prompt.js";
import { IDLE_GRACE_MS } from "./idle-timer.js";

const POLL_INTERVAL_MS = 5_000;

export type ClaimedCommand = {
  id: string;
  payload: unknown;
  sessionId: string;
  type: string;
};

// Drains pending commands for the session and returns once opencode has been
// idle for IDLE_GRACE_MS. Throws on handler errors bubbling through.
export async function runCommandLoop({
  client,
  job,
  notifications,
  opencodeSessionId,
  sessionId,
  signal,
  tracker,
}: {
  client: OpencodeClient;
  job: Job;
  notifications: NotifySubscription;
  opencodeSessionId: string;
  sessionId: string;
  signal: AbortSignal;
  tracker: IdleTracker;
}): Promise<void> {
  while (!signal.aborted) {
    const command = await queryClaimNextCommand(sessionId);

    if (command) {
      await dispatchCommand({
        client,
        command,
        job,
        opencodeSessionId,
        sessionId,
      });
      continue;
    }

    // No pending commands. If opencode has been idle long enough, exit so the
    // supervisor can pause the sandbox. If a command lands in the microseconds
    // between this check and the pause taking effect, the completed-job
    // listener in index.ts picks it up.
    const lastIdleAt = tracker.getLastIdleAt();
    if (lastIdleAt !== null && Date.now() - lastIdleAt >= IDLE_GRACE_MS) {
      return;
    }

    // Sleep until NOTIFY wakeup, timeout, or idle grace elapses.
    const timeToIdle =
      lastIdleAt !== null
        ? Math.max(0, IDLE_GRACE_MS - (Date.now() - lastIdleAt))
        : POLL_INTERVAL_MS;
    const sleepMs = Math.min(timeToIdle, POLL_INTERVAL_MS);

    await Promise.race([
      notifications.next(),
      // sleep rejects with AbortError when the signal fires; that's the
      // desired wakeup, not a real failure.
      sleep(sleepMs, undefined, { signal }).catch(() => undefined),
    ]);
  }
}

async function dispatchCommand({
  client,
  command,
  job,
  opencodeSessionId,
  sessionId,
}: {
  client: OpencodeClient;
  command: ClaimedCommand;
  job: Job;
  opencodeSessionId: string;
  sessionId: string;
}): Promise<void> {
  try {
    await queryTouchSessionActivity(sessionId);

    if (command.type !== "send-prompt") {
      throw new Error(`Unknown command type: ${command.type}`);
    }
    await handleSendPromptCommand({ client, command, opencodeSessionId });

    await queryFinishCommand({ commandId: command.id, status: "done" });
    await job.log(`Command ${command.id} (${command.type}) done`);
  } catch (error) {
    const message = formatError(error);
    await queryFinishCommand({
      commandId: command.id,
      error: message,
      status: "failed",
    });
    await job.log(`Command ${command.id} (${command.type}) failed: ${message}`);
  }
}

// Claims the oldest pending command for the session. BullMQ guarantees at most
// one supervisor per sessionId, so no locking is needed — a single UPDATE with
// a subquery is enough.
async function queryClaimNextCommand(
  sessionId: string,
): Promise<ClaimedCommand | undefined> {
  return db
    .updateTable("SessionCommand")
    .set({ status: "processing", updatedAt: new Date() })
    .where("id", "=", (eb) =>
      eb
        .selectFrom("SessionCommand")
        .select("id")
        .where("sessionId", "=", sessionId)
        .where("status", "=", "pending")
        .orderBy("createdAt", "asc")
        .limit(1),
    )
    .returning(["id", "sessionId", "type", "payload"])
    .executeTakeFirst();
}

async function queryFinishCommand({
  commandId,
  error,
  status,
}: {
  commandId: string;
  error?: string;
  status: Extract<SessionCommandStatus, "done" | "failed">;
}): Promise<void> {
  await db
    .updateTable("SessionCommand")
    .set({
      error: error ?? null,
      processedAt: new Date(),
      status,
      updatedAt: new Date(),
    })
    .where("id", "=", commandId)
    .execute();
}

async function queryTouchSessionActivity(sessionId: string): Promise<void> {
  await db
    .updateTable("Session")
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where("id", "=", sessionId)
    .execute();
}

