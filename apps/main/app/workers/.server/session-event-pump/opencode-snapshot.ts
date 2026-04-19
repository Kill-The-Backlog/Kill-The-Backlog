import type { Message, Part } from "@opencode-ai/sdk/v2";

import { createOpencodeClient } from "@opencode-ai/sdk/v2";

// A session snapshot as returned by opencode's `GET /session/:id/message`.
// `info` is the message (user or assistant); `parts` is every part that
// currently belongs to it. Treat this as the authoritative state of the
// session at the moment the fetch resolves.
export type SessionSnapshotMessage = {
  info: Message;
  parts: Part[];
};

// Fetches the full message + part snapshot for an opencode session. This is
// how the pump recovers any events that happened while it was disconnected:
// opencode's `/event` stream has no replay, but every persisted event is an
// idempotent snapshot of its aggregate, so re-reading the session's messages
// gives us the correct current state. Volatile `message.part.delta` frames
// are intentionally lost — the preceding `message.part.updated` is already
// a complete snapshot of the part at that point.
export async function fetchSessionSnapshot({
  opencodeBaseUrl,
  opencodeSessionId,
  signal,
}: {
  opencodeBaseUrl: string;
  opencodeSessionId: string;
  signal: AbortSignal;
}): Promise<SessionSnapshotMessage[]> {
  const client = createOpencodeClient({ baseUrl: opencodeBaseUrl });
  const result = await client.session.messages(
    { sessionID: opencodeSessionId },
    { signal },
  );
  if (result.error) {
    throw new Error("Failed to fetch opencode session snapshot", {
      cause: result.error,
    });
  }
  return result.data;
}
