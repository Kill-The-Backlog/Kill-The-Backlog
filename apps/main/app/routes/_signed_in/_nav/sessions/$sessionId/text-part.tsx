import type { Part } from "@opencode-ai/sdk/v2";

export function TextPart({ part }: { part: Extract<Part, { type: "text" }> }) {
  if (!part.text) return null;
  return <div className="whitespace-pre-wrap">{part.text}</div>;
}
