import type { SessionMessagesResponse, Todo } from "@opencode-ai/sdk/v2";

import { createOpencodeClient } from "@opencode-ai/sdk/v2";

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
}): Promise<SessionMessagesResponse> {
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

// Fetches the current todo list for an opencode session. Todos are a persisted
// session aggregate too, so the pump snapshots them on every reconnect before
// replaying buffered live `todo.updated` events.
export async function fetchTodoSnapshot({
  opencodeBaseUrl,
  opencodeSessionId,
  signal,
}: {
  opencodeBaseUrl: string;
  opencodeSessionId: string;
  signal: AbortSignal;
}): Promise<Todo[]> {
  const client = createOpencodeClient({ baseUrl: opencodeBaseUrl });
  const result = await client.session.todo(
    { sessionID: opencodeSessionId },
    { signal },
  );
  if (result.error) {
    throw new Error("Failed to fetch opencode todo snapshot", {
      cause: result.error,
    });
  }
  return result.data;
}
