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
    <Collapsible className="text-muted-foreground">
      <CollapsibleTrigger className="hover:text-foreground group/reasoning flex cursor-pointer items-center gap-1 text-xs">
        {done ? "Thought" : "Thinking"}
        <CaretDownIcon className="size-3 shrink-0 -rotate-90 opacity-0 transition-[transform,opacity] group-hover/reasoning:opacity-100 group-data-[state=open]/reasoning:rotate-0 group-data-[state=open]/reasoning:opacity-100" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border mt-2 border-l-2 pl-3 text-xs whitespace-pre-wrap italic">
        {part.text}
      </CollapsibleContent>
    </Collapsible>
  );
}
