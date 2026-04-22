import type { Part } from "@opencode-ai/sdk/v2";

import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { z } from "zod";

import { Spinner } from "#components/ui/spinner.js";

const grepInputSchema = z.object({
  include: z.string().optional(),
  path: z.string().optional(),
  pattern: z.string().optional(),
});

export function ToolPart({ part }: { part: Extract<Part, { type: "tool" }> }) {
  if (part.tool === "grep") {
    return <GrepToolPart part={part} />;
  }

  const { state, tool } = part;
  const title = "title" in state ? state.title : undefined;

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <ToolStatusIcon status={state.status} />
      <span className="font-medium">{tool}</span>
      {title && <span className="truncate">{title}</span>}
    </div>
  );
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function GrepToolPart({ part }: { part: Extract<Part, { type: "tool" }> }) {
  const { include, path, pattern } =
    grepInputSchema.safeParse(part.state.input).data ?? {};
  const fileName = path ? basename(path) : undefined;
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? "Grepped" : "Grepping";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {pattern && <span className="text-muted-foreground"> {pattern}</span>}
      {fileName && (
        <span className="text-muted-foreground"> in {fileName}</span>
      )}
      {include && (
        <span className="text-muted-foreground"> matching {include}</span>
      )}
    </div>
  );
}

function ToolStatusIcon({
  status,
}: {
  status: Extract<Part, { type: "tool" }>["state"]["status"];
}) {
  switch (status) {
    case "completed":
      return <CheckIcon className="text-foreground size-3" />;
    case "error":
      return <XIcon className="text-destructive size-3" />;
    case "pending":
    case "running":
      return <Spinner className="size-3" />;
  }
}
