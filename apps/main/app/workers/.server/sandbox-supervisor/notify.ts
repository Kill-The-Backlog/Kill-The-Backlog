import { sql } from "@ktb/db/kysely-helpers";
import pg from "pg";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";

// Supervisor processes a command when the route action inserts a SessionCommand
// and sends a NOTIFY on this channel. subscribeToSessionNotifications holds a
// dedicated pg.Client because LISTEN is bound to the connection it runs on
// (a pooled connection would lose it on release), and notifications arrive
// as events on the raw pg.Client that Kysely doesn't expose.

export type NotifySubscription = {
  close: () => Promise<void>;
  /**
   * Resolves when the next NOTIFY arrives or the signal aborts. Single-consumer
   * only — the command loop is the sole caller; overlapping next() calls would
   * drop wakeups.
   */
  next: () => Promise<void>;
};

// Route actions call this after inserting a SessionCommand row so that an
// already-running supervisor wakes immediately instead of sleeping on its poll
// interval.
export async function notifySession(sessionId: string): Promise<void> {
  const channel = channelName(sessionId);
  await sql`NOTIFY ${sql.raw(channel)}`.execute(db);
}

export async function subscribeToSessionNotifications(
  sessionId: string,
  signal: AbortSignal,
): Promise<NotifySubscription> {
  const client = new pg.Client({ connectionString: serverEnv.DB_URL });
  await client.connect();

  const channel = channelName(sessionId);
  await client.query(`LISTEN ${channel}`);

  // `pending` coalesces notifications that arrive while no one is awaiting
  // next(). `waiter` is set only while next() is suspended.
  let pending = false;
  let waiter: (() => void) | null = null;

  const wake = () => {
    pending = true;
    const resolve = waiter;
    waiter = null;
    resolve?.();
  };

  client.on("notification", (message) => {
    if (message.channel === channel) wake();
  });
  signal.addEventListener("abort", wake, { once: true });

  return {
    async close() {
      signal.removeEventListener("abort", wake);
      try {
        await client.query(`UNLISTEN ${channel}`);
      } finally {
        await client.end();
      }
    },
    async next() {
      if (pending || signal.aborted) {
        pending = false;
        return;
      }
      await new Promise<void>((resolve) => {
        waiter = resolve;
      });
      pending = false;
    },
  };
}

function channelName(sessionId: string): string {
  // Channel names must be valid SQL identifiers. UUIDs contain dashes, which
  // aren't allowed in unquoted identifiers, so we replace them with underscores.
  return `session_${sessionId.replace(/-/g, "_")}`;
}
