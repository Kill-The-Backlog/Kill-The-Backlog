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
  const { main, suffix } =
    part.time.end !== undefined
      ? {
          main: "Thought",
          suffix: formatDuration(part.time.end - part.time.start),
        }
      : { main: "Thinking", suffix: undefined };

  const label = (
    <>
      {main}
      {suffix && <span className="text-muted-foreground"> {suffix}</span>}
    </>
  );

  if (!part.text) {
    return <div className="text-foreground/75 text-xs">{label}</div>;
  }
  return (
    <Collapsible className="text-xs">
      <CollapsibleTrigger className="group/reasoning text-foreground/75 flex cursor-pointer items-center gap-1">
        {label}
        <CaretDownIcon className="size-3 shrink-0 -rotate-90 opacity-0 transition-[rotate,opacity] group-hover/reasoning:opacity-100 group-data-[state=open]/reasoning:rotate-0 group-data-[state=open]/reasoning:opacity-100" />
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground mt-2 whitespace-pre-wrap italic">
        {part.text}
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return "briefly";

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `for ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `for ${minutes}m`;
  return `for ${minutes}m ${remainingSeconds}s`;
}
