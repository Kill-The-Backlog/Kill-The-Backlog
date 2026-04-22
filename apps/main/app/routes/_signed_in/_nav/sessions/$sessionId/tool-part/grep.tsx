import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

import { basename } from "#lib/utils/basename.js";

const grepInputSchema = z.object({
  include: z.string().optional(),
  path: z.string().optional(),
  pattern: z.string().optional(),
});

export function GrepToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { include, path, pattern } =
    grepInputSchema.safeParse(part.state.input).data ?? {};
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? "Grepped" : "Grepping";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {pattern && <span className="text-muted-foreground"> {pattern}</span>}
      {path && (
        <span className="text-muted-foreground"> in {basename(path)}</span>
      )}
      {include && (
        <span className="text-muted-foreground"> matching {include}</span>
      )}
    </div>
  );
}
