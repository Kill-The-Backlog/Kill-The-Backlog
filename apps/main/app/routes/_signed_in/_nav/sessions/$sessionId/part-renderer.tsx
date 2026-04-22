import type { Part } from "@opencode-ai/sdk/v2";

import { ReasoningPart } from "./reasoning-part.js";
import { TextPart } from "./text-part.js";
import { ToolPart } from "./tool-part.js";

export function PartRenderer({ part }: { part: Part }) {
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
