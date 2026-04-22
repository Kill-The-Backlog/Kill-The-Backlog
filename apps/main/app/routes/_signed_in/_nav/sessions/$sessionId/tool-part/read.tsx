import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

import { basename } from "#lib/utils/basename.js";

const readInputSchema = z.object({
  filePath: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export function ReadToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { filePath, limit, offset } =
    readInputSchema.safeParse(part.state.input).data ?? {};
  const startLine = offset ?? 1;
  const range =
    limit !== undefined ? `L${startLine}-${startLine + limit - 1}` : undefined;
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? "Read" : "Reading";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {filePath && (
        <span className="text-muted-foreground"> {basename(filePath)}</span>
      )}
      {range && <span className="text-muted-foreground"> {range}</span>}
    </div>
  );
}
