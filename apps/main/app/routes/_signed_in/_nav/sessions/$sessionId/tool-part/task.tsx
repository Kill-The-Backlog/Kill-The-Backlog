import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

const taskInputSchema = z.object({
  description: z.string().optional(),
});

export function TaskToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { description } =
    taskInputSchema.safeParse(part.state.input).data ?? {};
  const isDone =
    part.state.status === "completed" || part.state.status === "error";
  const verb = isDone ? "Ran task" : "Running task";

  return (
    <div className="text-foreground/75 text-xs">
      {verb}
      {description && (
        <span className="text-muted-foreground"> {description}</span>
      )}
    </div>
  );
}
