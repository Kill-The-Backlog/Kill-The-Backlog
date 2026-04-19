import type { Event } from "@opencode-ai/sdk/v2";

// Opens a single SSE connection to opencode's `/event` endpoint and returns
// an async generator of each event as it arrives. Opencode's `/event`
// stream has no replay: it delivers events from the moment the client
// connects, with no `Last-Event-ID` support. The pump compensates by
// fetching a fresh `/session/:id/message` snapshot on every (re)connect.
//
// The returned promise resolves ONLY AFTER the response headers have been
// received. This lets callers do "subscribe-then-snapshot" properly:
// await this, then fetch the snapshot, knowing that any event opencode
// emits from this point on is being captured on the wire by our fetch.
// Awaiting a normal `async function*` would NOT give that guarantee — its
// first iteration is what triggers the fetch, so the subscribe and
// snapshot fetches would race.
//
// The returned generator owns the connection and ends when the stream
// closes (remote end, network blip, or `signal` aborts). The pump's outer
// loop is responsible for reconnect + snapshot on disconnect.
//
// We deliberately don't use the SDK's `client.event.subscribe()` here. Its
// SSE client owns its own reconnect-with-exponential-backoff loop inside a
// single generator, so silent retries would skip the subscribe-then-snapshot
// pairing the pump relies on and drop any event emitted during a reconnect.
// It also sets `Last-Event-ID` on reconnect (opencode ignores it) and
// swallows errors into an `onSseError` callback instead of throwing, which
// is awkward to wire into the outer loop's retry semantics.
export async function openOpencodeEventStream({
  opencodeBaseUrl,
  signal,
}: {
  opencodeBaseUrl: string;
  signal: AbortSignal;
}): Promise<AsyncGenerator<Event>> {
  const res = await fetch(`${opencodeBaseUrl}/event`, {
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!res.ok) {
    throw new Error(
      `opencode /event responded ${res.status} ${res.statusText}`,
    );
  }
  if (!res.body) throw new Error("opencode /event returned no body");

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  return iterateEventFrames(reader, signal);
}

async function* iterateEventFrames(
  reader: ReadableStreamDefaultReader<string>,
  signal: AbortSignal,
): AsyncGenerator<Event> {
  let buffer = "";
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) return;

      buffer += value;
      // Normalize line endings per SSE spec before frame splitting.
      buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const parsed = parseFrame(frame);
        if (parsed) yield parsed;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Abort-induced cancel can reject; nothing useful to do.
    }
  }
}

function parseFrame(frame: string): Event | null {
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith(":") || line === "") continue;
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^\s/, ""));
      continue;
    }
    // Ignore other field names (id:, event:, retry:). Opencode doesn't
    // emit `id:` on this stream, so tracking it would be meaningless.
  }

  if (dataLines.length === 0) return null;
  try {
    return JSON.parse(dataLines.join("\n")) as Event;
  } catch {
    return null;
  }
}
