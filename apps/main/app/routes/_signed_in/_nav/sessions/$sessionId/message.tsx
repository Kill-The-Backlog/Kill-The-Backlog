import type { Part } from "@opencode-ai/sdk/v2";
import type { QueryRowType } from "@rocicorp/zero";

import type { queries } from "#zero/queries.js";

import { ReasoningPart } from "./reasoning-part.js";
import { TextPart } from "./text-part.js";
import { ToolPart } from "./tool-part.js";

type MessageRow = NonNullable<
  QueryRowType<typeof queries.sessions.one>
>["messages"][number];

export function Message({ message }: { message: MessageRow }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {message.parts.map((row) => (
        <PartRenderer key={row.id} part={row.data as Part} />
      ))}
    </div>
  );
}

function PartRenderer({ part }: { part: Part }) {
  switch (part.type) {
    case "reasoning":
      return <ReasoningPart part={part} />;
    case "text":
      return <TextPart part={part} />;
    case "tool":
      return <ToolPart part={part} />;
    default:
      return null;
  }
}
