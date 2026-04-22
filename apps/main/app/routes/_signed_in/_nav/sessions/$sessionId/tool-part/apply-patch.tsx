import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

import { pluralize } from "#lib/utils/pluralize.js";

const applyPatchMetadataSchema = z.object({
  files: z
    .array(
      z.object({
        additions: z.number(),
        deletions: z.number(),
      }),
    )
    .optional(),
});

export function ApplyPatchToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const rawMetadata =
    "metadata" in part.state ? part.state.metadata : undefined;
  const { files } = applyPatchMetadataSchema.safeParse(rawMetadata).data ?? {};
  const additions = files?.reduce((sum, f) => sum + f.additions, 0) ?? 0;
  const deletions = files?.reduce((sum, f) => sum + f.deletions, 0) ?? 0;
  const fileCount = files?.length ?? 0;
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? "Applied patch" : "Applying patch";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {fileCount > 0 && (
        <span className="text-muted-foreground">
          {" "}
          to {pluralize(fileCount, "file")}
        </span>
      )}
      {(additions > 0 || deletions > 0) && (
        <span className="text-muted-foreground">
          {" "}
          +{additions} -{deletions}
        </span>
      )}
    </div>
  );
}
