import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

import { basename } from "#lib/utils/basename.js";

const editInputSchema = z.object({
  filePath: z.string().optional(),
});

const editMetadataSchema = z.object({
  filediff: z
    .object({
      additions: z.number(),
      deletions: z.number(),
    })
    .optional(),
});

export function EditToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { filePath } = editInputSchema.safeParse(part.state.input).data ?? {};
  const rawMetadata =
    "metadata" in part.state ? part.state.metadata : undefined;
  const { filediff } = editMetadataSchema.safeParse(rawMetadata).data ?? {};
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? "Edited" : "Editing";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {filePath && (
        <span className="text-muted-foreground"> {basename(filePath)}</span>
      )}
      {filediff && (
        <span className="text-muted-foreground">
          {" "}
          +{filediff.additions} -{filediff.deletions}
        </span>
      )}
    </div>
  );
}
