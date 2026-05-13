import { createOpencodeClient } from "@opencode-ai/sdk/v2";

import { getModelByValue } from "#lib/opencode/models.js";

import { opencodeBaseUrl } from "./base-url.js";

// Posts a prompt to an opencode session running inside an E2B sandbox.
// Sandboxes are created with `autoResume: true`, so if the sandbox is
// paused E2B's edge proxy holds the request open until the VM resumes —
// callers don't need to resume explicitly or retry for the wake-up path.
//
// This is a pure opencode wrapper: it takes the session IDs plus our canonical
// model selection value and never touches our DB.
export async function sendPrompt({
  e2bSandboxId,
  modelSelection,
  opencodeSessionId,
  text,
}: {
  e2bSandboxId: string;
  modelSelection: string;
  opencodeSessionId: string;
  text: string;
}): Promise<void> {
  const model = getModelByValue(modelSelection);
  const client = createOpencodeClient({
    baseUrl: opencodeBaseUrl(e2bSandboxId),
  });

  const result = await client.session.promptAsync({
    model: {
      modelID: model.modelID,
      providerID: model.providerID,
    },
    parts: [{ text, type: "text" }],
    sessionID: opencodeSessionId,
  });
  if (result.error) {
    throw new Error("Failed to send prompt to opencode session", {
      cause: result.error,
    });
  }
}
