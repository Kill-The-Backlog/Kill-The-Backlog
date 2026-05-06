import { createOpencodeClient } from "@opencode-ai/sdk/v2";

import { opencodeBaseUrl } from "./base-url.js";

export async function stopOpencodeSession({
  e2bSandboxId,
  opencodeSessionId,
}: {
  e2bSandboxId: string;
  opencodeSessionId: string;
}): Promise<void> {
  const client = createOpencodeClient({
    baseUrl: opencodeBaseUrl(e2bSandboxId),
  });

  const result = await client.session.abort({
    sessionID: opencodeSessionId,
  });
  if (result.error) {
    throw new Error("Failed to stop opencode session", {
      cause: result.error,
    });
  }
}
