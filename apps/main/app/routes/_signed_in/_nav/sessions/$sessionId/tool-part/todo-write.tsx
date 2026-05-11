import type { Part } from "@opencode-ai/sdk/v2";

import { z } from "zod";

const todoSchema = z.object({
  content: z.string(),
  status: z.string(),
});

const todoWriteInputSchema = z.object({
  todos: z.array(todoSchema).optional(),
});

export function TodoWriteToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { todos } =
    todoWriteInputSchema.safeParse(part.state.input).data ?? {};
  const label =
    part.state.status === "error"
      ? "Could not update todo list"
      : part.state.status === "completed"
        ? "Updated todo list"
        : "Updating todo list";
  const inProgressTodo = todos?.find((todo) => todo.status === "in_progress");

  return (
    <div className="text-foreground/75 text-xs">
      {label}
      {inProgressTodo && (
        <span className="text-muted-foreground"> {inProgressTodo.content}</span>
      )}
    </div>
  );
}
