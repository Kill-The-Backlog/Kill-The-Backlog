import { anthropic } from "#lib/.server/clients/anthropic.js";

// Claude Haiku 4.5 — cheapest/fastest current Anthropic model. Titling is
// a one-shot, low-stakes task so we don't need Sonnet-tier reasoning.
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = [
  "You write short titles for coding session prompts that show up in a sidebar.",
  "The user message contains the prompt to title inside <prompt>…</prompt> tags.",
  "Rules:",
  "- 3 to 6 words.",
  "- Title Case.",
  "- No quotes, no trailing punctuation, no emoji.",
  "- Describe the task, not the speaker (no 'I want to…', no 'Help me…').",
  "- Output only the title, nothing else.",
].join("\n");

export async function generateSessionTitle(prompt: string): Promise<string> {
  const userContent = [
    "Prompt to title:",
    "",
    "<prompt>",
    prompt,
    "</prompt>",
  ].join("\n");

  const message = await anthropic.messages.create({
    max_tokens: 32,
    messages: [{ content: userContent, role: "user" }],
    model: MODEL,
    system: SYSTEM_PROMPT,
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("Anthropic response contained no text block");
  }

  return textBlock.text.trim();
}
