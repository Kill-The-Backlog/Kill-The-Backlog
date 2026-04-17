import type { OpencodeClient } from "@opencode-ai/sdk/v2";

import { z } from "zod";

import type { ClaimedCommand } from "./command-loop.js";

const payloadSchema = z.object({
  text: z.string().min(1),
});

export async function handleSendPromptCommand({
  client,
  command,
  opencodeSessionId,
}: {
  client: OpencodeClient;
  command: ClaimedCommand;
  opencodeSessionId: string;
}): Promise<void> {
  const { text } = payloadSchema.parse(command.payload);

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
