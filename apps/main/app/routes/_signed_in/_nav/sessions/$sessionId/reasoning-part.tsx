import type { Part } from "@opencode-ai/sdk/v2";

import { CaretDownIcon } from "@phosphor-icons/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components/ui/collapsible.js";

export function ReasoningPart({
  part,
}: {
  part: Extract<Part, { type: "reasoning" }>;
}) {
  const done = part.time.end !== undefined;

  if (!part.text) {
    return (
      <div className="text-muted-foreground text-xs">
        {done ? "Thought" : "Thinking"}
      </div>
    );
  }
  return (
    <Collapsible className="text-muted-foreground group/reasoning">
      <CollapsibleTrigger className="hover:text-foreground flex items-center gap-1 text-xs">
        <CaretDownIcon className="size-3 shrink-0 -rotate-90 transition-transform group-data-[state=open]/reasoning:rotate-0" />
        {done ? "Thought" : "Thinking"}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border mt-2 border-l-2 pl-3 text-xs whitespace-pre-wrap italic">
        {part.text}
      </CollapsibleContent>
    </Collapsible>
  );
}
