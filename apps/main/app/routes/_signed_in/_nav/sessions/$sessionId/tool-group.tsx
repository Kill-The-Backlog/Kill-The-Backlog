import type { Part } from "@opencode-ai/sdk/v2";

import { CaretDownIcon } from "@phosphor-icons/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components/ui/collapsible.js";
import { pluralize } from "#lib/utils/pluralize.js";

import { PartRenderer } from "./part-renderer.js";
import { FOLD_IN_TOOLS, isFoldInTool } from "./timeline.js";
import { readInputSchema } from "./tool-part/read.js";

export function ToolGroup({ parts }: { parts: Part[] }) {
  return (
    <Collapsible className="text-xs">
      <CollapsibleTrigger className="group/explored text-foreground/75 flex cursor-pointer items-center gap-1">
        {summarizeExplored(parts)}
        <CaretDownIcon className="size-3 shrink-0 -rotate-90 opacity-0 transition-[rotate,opacity] group-hover/explored:opacity-100 group-data-[state=open]/explored:rotate-0 group-data-[state=open]/explored:opacity-100" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 flex flex-col gap-3">
        {parts.map((part) => (
          <PartRenderer key={part.id} part={part} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function summarizeExplored(parts: Part[]): string {
  const readFiles = new Set<string>();
  let searches = 0;
  let webLookups = 0;
  let skills = 0;

  for (const part of parts) {
    if (part.type !== "tool" || !isFoldInTool(part.tool)) continue;
    switch (FOLD_IN_TOOLS[part.tool]) {
      case "read": {
        const { filePath } =
          readInputSchema.safeParse(part.state.input).data ?? {};
        if (filePath) readFiles.add(filePath);
        break;
      }
      case "search":
        searches++;
        break;
      case "skill":
        skills++;
        break;
      case "webLookup":
        webLookups++;
        break;
    }
  }

  const segments = [
    readFiles.size > 0 && pluralize(readFiles.size, "file"),
    searches > 0 && pluralize(searches, "search", "searches"),
    webLookups > 0 && pluralize(webLookups, "web lookup"),
    skills > 0 && pluralize(skills, "skill"),
  ].filter(Boolean);

  if (segments.length === 0) return "Explored";
  return `Explored ${segments.join(", ")}`;
}
