import type { Part } from "@opencode-ai/sdk/v2";

import type { MessageRow } from "./message.js";

export function UserPrompt({ message }: { message: MessageRow }) {
  const text = message.parts
    .map((row) => {
      const part = row.data as Part;
      return part.type === "text" ? part.text : "";
    })
    .join("");

  if (!text) return null;

  return (
    <div className="bg-muted ml-auto max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap">
      {text}
    </div>
  );
}
