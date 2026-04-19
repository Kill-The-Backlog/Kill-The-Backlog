import { createOpencodeClient } from "@opencode-ai/sdk/v2";

import { opencodeBaseUrl } from "./base-url.js";

// Posts a prompt to an opencode session running inside an E2B sandbox.
// Sandboxes are created with `autoResume: true`, so if the sandbox is
// paused E2B's edge proxy holds the request open until the VM resumes —
// callers don't need to resume explicitly or retry for the wake-up path.
//
// This is a pure opencode wrapper: it takes the IDs it needs and never
// touches our DB. Callers are responsible for resolving the IDs (from a
// route's auth query, the bootstrapper's freshly-created sandbox, etc.).
export async function sendPrompt({
  e2bSandboxId,
  opencodeSessionId,
  text,
}: {
  e2bSandboxId: string;
  opencodeSessionId: string;
  text: string;
}): Promise<void> {
  const client = createOpencodeClient({
    baseUrl: opencodeBaseUrl(e2bSandboxId),
  });

  const result = await client.session.promptAsync({
    parts: [{ text, type: "text" }],
    sessionID: opencodeSessionId,
  });
  if (result.error) {
    throw new Error("Failed to send prompt to opencode session", {
      cause: result.error,
    });
  }
}
