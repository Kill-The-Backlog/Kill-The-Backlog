import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

import { basename } from "#lib/utils/basename.js";

const writeInputSchema = z.object({
  filePath: z.string().optional(),
});

const writeMetadataSchema = z.object({
  exists: z.boolean().optional(),
});

export function WriteToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { filePath } = writeInputSchema.safeParse(part.state.input).data ?? {};
  const rawMetadata =
    "metadata" in part.state ? part.state.metadata : undefined;
  const { exists } = writeMetadataSchema.safeParse(rawMetadata).data ?? {};
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? (exists === false ? "Created" : "Wrote") : "Writing";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {filePath && (
        <span className="text-muted-foreground"> {basename(filePath)}</span>
      )}
    </div>
  );
}
