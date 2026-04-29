import type { ModelId } from "#lib/opencode/models.js";

import { sendPrompt } from "#lib/.server/opencode/send-prompt.js";
import { sessionEventPumpWorker } from "#workers/.server/session-event-pump/index.js";

// Ensures the event pump is running for a session, then sends a prompt to
// opencode. Both the bootstrapper (initial prompt) and the follow-up
// route (subsequent prompts) go through this so the ordering invariant is
// centralized: enqueue the pump BEFORE posting the prompt so the pump is
// primed against opencode's SSE stream before opencode starts emitting.
// The pump also fetches a `/session/:id/message` snapshot on every
// (re)connect, so nothing is lost if it starts slightly after the prompt
// lands — this ordering just keeps the race window as small as possible.
export async function dispatchPrompt({
  e2bSandboxId,
  model,
  opencodeSessionId,
  sessionId,
  text,
}: {
  e2bSandboxId: string;
  model: ModelId;
  opencodeSessionId: string;
  sessionId: string;
  text: string;
}): Promise<void> {
  await sessionEventPumpWorker.enqueue(
    { sessionId },
    { jobId: sessionId, replaceFinished: true },
  );
  await sendPrompt({ e2bSandboxId, model, opencodeSessionId, text });
}
