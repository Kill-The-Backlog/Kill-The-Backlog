import { z } from "zod";

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

export function createClaudeCodeParser(onText: (text: string) => void) {
  let buffer = "";

  return {
    feed(chunk: string) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (line.length > 0) {
          processLine(line, onText);
        }
      }
    },
    flush() {
      if (buffer.length > 0) {
        processLine(buffer, onText);
        buffer = "";
      }
    },
  };
}

function processLine(
  line: string,
  onText: (text: string) => void,
): void {
  const result = claudeAssistantEvent.safeParse(JSON.parse(line));
  if (!result.success) return;

  for (const block of result.data.message.content) {
    const textBlock = claudeTextBlock.safeParse(block);
    if (textBlock.success) {
      onText(textBlock.data.text);
    }
  }
}
