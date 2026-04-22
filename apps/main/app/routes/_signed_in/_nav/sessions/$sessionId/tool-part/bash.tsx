import type { Part } from "@opencode-ai/sdk/v2";

import { TerminalWindowIcon } from "@phosphor-icons/react";
import { z } from "zod";

const bashInputSchema = z.object({
  command: z.string().optional(),
  description: z.string().optional(),
});

export function BashToolPart({
  part,
}: {
  part: Extract<Part, { type: "tool" }>;
}) {
  const { command, description } =
    bashInputSchema.safeParse(part.state.input).data ?? {};
  const commandName = command?.trim().split(" ")[0];

  return (
    <div className="border-input text-foreground/75 flex h-8 w-full items-center gap-2 border px-2.5 text-xs">
      <TerminalWindowIcon className="size-3.5 shrink-0" />
      {description && <span className="truncate">{description}</span>}
      {commandName && (
        <span className="text-muted-foreground truncate">{commandName}</span>
      )}
    </div>
  );
}
