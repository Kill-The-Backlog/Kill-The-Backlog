import type { Part } from "@opencode-ai/sdk/v2";

import { CheckIcon, XIcon } from "@phosphor-icons/react";

import { Spinner } from "#components/ui/spinner.js";

import { ApplyPatchToolPart } from "./tool-part/apply-patch.js";
import { BashToolPart } from "./tool-part/bash.js";
import { EditToolPart } from "./tool-part/edit.js";
import { GlobToolPart } from "./tool-part/glob.js";
import { GrepToolPart } from "./tool-part/grep.js";
import { ReadToolPart } from "./tool-part/read.js";
import { TaskToolPart } from "./tool-part/task.js";
import { TodoWriteToolPart } from "./tool-part/todo-write.js";
import { WriteToolPart } from "./tool-part/write.js";

export function ToolPart({ part }: { part: Extract<Part, { type: "tool" }> }) {
  switch (part.tool) {
    case "apply_patch":
      return <ApplyPatchToolPart part={part} />;
    case "bash":
      return <BashToolPart part={part} />;
    case "edit":
      return <EditToolPart part={part} />;
    case "glob":
      return <GlobToolPart part={part} />;
    case "grep":
      return <GrepToolPart part={part} />;
    case "read":
      return <ReadToolPart part={part} />;
    case "task":
      return <TaskToolPart part={part} />;
    case "todowrite":
      return <TodoWriteToolPart part={part} />;
    case "write":
      return <WriteToolPart part={part} />;
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
