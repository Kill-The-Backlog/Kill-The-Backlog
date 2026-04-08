import { z } from "zod";

import type { RunOutputEvent } from "#lib/run-output.js";

const claudeTextBlock = z.object({
  text: z.string(),
  type: z.literal("text"),
});

const claudeAssistantEvent = z.object({
  message: z.object({
    content: z.array(z.looseObject({ type: z.string() })),
  }),
  type: z.literal("assistant"),
});

export function createClaudeCodeParser(
  onEvent: (event: RunOutputEvent) => void,
) {
  let buffer = "";

  return {
    feed(chunk: string) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (line.length > 0) {
          processLine(line, onEvent);
        }
      }
    },
    flush() {
      if (buffer.length > 0) {
        processLine(buffer, onEvent);
        buffer = "";
      }
    },
  };
}

function processLine(
  line: string,
  onEvent: (event: RunOutputEvent) => void,
): void {
  const result = claudeAssistantEvent.safeParse(JSON.parse(line));
  if (!result.success) return;

  for (const block of result.data.message.content) {
    const textBlock = claudeTextBlock.safeParse(block);
    if (textBlock.success) {
      onEvent({ text: textBlock.data.text, type: "assistant-text" });
    }
  }
}
