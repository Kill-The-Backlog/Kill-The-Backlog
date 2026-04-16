import type { Part } from "@opencode-ai/sdk/v2";

import { CheckIcon, XIcon } from "@phosphor-icons/react";

import { Spinner } from "#components/ui/spinner.js";

export function ToolPart({ part }: { part: Extract<Part, { type: "tool" }> }) {
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
