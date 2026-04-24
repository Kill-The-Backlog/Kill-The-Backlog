import type { Part } from "@opencode-ai/sdk/v2";

import { CaretDownIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import { z } from "zod";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components/ui/collapsible.js";
import { useStickyScroll } from "#hooks/use-sticky-scroll.js";
import { cn } from "#lib/utils/cn.js";

const bashInputSchema = z.object({
  command: z.string().optional(),
  description: z.string().optional(),
});

const bashMetadataSchema = z.object({
  output: z.string().optional(),
});

export function BashToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { command, description } =
    bashInputSchema.safeParse(part.state.input).data ?? {};
  const commandName = command?.trim().split(" ")[0];
  const output = resolveOutput(part.state);
  const errored = part.state.status === "error";

  const containerBorder = errored ? "border-destructive" : "border-input";
  const headerTone = errored ? "text-destructive" : "text-foreground/75";
  const subduedTone = errored ? "text-destructive/75" : "text-muted-foreground";
  const preTone = errored ? "text-destructive" : "text-muted-foreground";

  const header = (
    <>
      <TerminalWindowIcon className="size-3.5 shrink-0" />
      {description && <span className="truncate">{description}</span>}
      {commandName && (
        <span className={cn("truncate", subduedTone)}>{commandName}</span>
      )}
    </>
  );

  if (!output) {
    return (
      <div
        className={cn(
          "flex h-8 w-full items-center gap-2 border px-2.5 text-xs",
          containerBorder,
          headerTone,
        )}
      >
        {header}
      </div>
    );
  }

  return (
    <Collapsible
      className={cn("w-full border text-xs", containerBorder, headerTone)}
    >
      <CollapsibleTrigger className="group/bash hover:bg-accent/50 flex h-8 w-full cursor-pointer items-center gap-2 px-2.5">
        {header}
        <CaretDownIcon className="ml-auto size-3 shrink-0 -rotate-90 opacity-0 transition-[rotate,opacity] group-hover/bash:opacity-100 group-data-[state=open]/bash:rotate-0 group-data-[state=open]/bash:opacity-100" />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn("border-t", containerBorder)}>
        <BashOutput output={output} preTone={preTone} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function BashOutput({ output, preTone }: { output: string; preTone: string }) {
  const ref = useStickyScroll<HTMLPreElement>();
  return (
    <div className="max-h-96 overflow-auto">
      <pre
        className={cn("p-2.5 font-mono whitespace-pre-wrap", preTone)}
        ref={ref}
      >
        {output}
      </pre>
    </div>
  );
}

function resolveOutput(
  state: Extract<Part, { type: "tool" }>["state"],
): string | undefined {
  switch (state.status) {
    case "completed":
      return state.output;
    case "error":
      return state.error;
    case "pending":
      return undefined;
    case "running": {
      const { output } =
        bashMetadataSchema.safeParse(state.metadata).data ?? {};
      return output;
    }
  }
}
