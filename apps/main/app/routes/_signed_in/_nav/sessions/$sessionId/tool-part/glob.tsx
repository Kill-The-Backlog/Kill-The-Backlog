import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

import { basename } from "#lib/utils/basename.js";

const globInputSchema = z.object({
  path: z.string().optional(),
  pattern: z.string().optional(),
});

export function GlobToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { path, pattern } =
    globInputSchema.safeParse(part.state.input).data ?? {};
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? "Searched files" : "Searching files";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {pattern && <span className="text-muted-foreground"> {pattern}</span>}
      {path && (
        <span className="text-muted-foreground"> in {basename(path)}</span>
      )}
    </div>
  );
}
