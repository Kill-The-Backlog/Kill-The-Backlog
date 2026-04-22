import type { Part } from "@opencode-ai/sdk/v2";
import type { QueryRowType } from "@rocicorp/zero";

import type { queries } from "#zero/queries.js";

export type MessageRow = SessionRow["messages"][number];
type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

// Single source of truth for which tools fold into an Explored group and
// which summary bucket each one feeds — keeps classification and the summary
// label from drifting apart.
export const FOLD_IN_TOOLS = {
  glob: "search",
  grep: "search",
  lsp: "search",
  read: "read",
  skill: "skill",
  webfetch: "webLookup",
  websearch: "webLookup",
} as const;

export type TimelineItem =
  | { keyId: string; kind: "group"; parts: Part[] }
  | { kind: "part"; part: Part }
  | { kind: "user"; message: MessageRow };

type FoldInTool = keyof typeof FOLD_IN_TOOLS;

type PartClassification = "anchor" | "boundary" | "rider" | "skip";

export function buildTimeline(messages: readonly MessageRow[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let openGroup: null | {
    anchorCount: number;
    firstId: string;
    parts: Part[];
  } = null;

  const closeGroup = () => {
    if (!openGroup) return;
    // Only worth "Explored" framing when there's a real journey to hide —
    // a singleton tool run (or a reasoning-only run) dissolves into its
    // individual parts so we don't show a collapsible around one thing.
    if (openGroup.anchorCount >= 2) {
      items.push({
        keyId: openGroup.firstId,
        kind: "group",
        parts: openGroup.parts,
      });
    } else {
      for (const part of openGroup.parts) items.push({ kind: "part", part });
    }
    openGroup = null;
  };

  for (const message of messages) {
    if (message.role === "user") {
      closeGroup();
      items.push({ kind: "user", message });
      continue;
    }

    for (const row of message.parts) {
      const part = row.data as Part;
      const classification = classifyPart(part);
      switch (classification) {
        case "skip":
          continue;
        case "anchor":
        case "rider":
          openGroup ??= { anchorCount: 0, firstId: part.id, parts: [] };
          openGroup.parts.push(part);
          if (classification === "anchor") openGroup.anchorCount++;
          continue;
        case "boundary":
          closeGroup();
          items.push({ kind: "part", part });
          continue;
      }
    }
  }

  closeGroup();
  return items;
}

export function isFoldInTool(tool: string): tool is FoldInTool {
  return tool in FOLD_IN_TOOLS;
}

// Classifies a part for timeline grouping. Only the three part types that
// `PartRenderer` actually renders map to `"anchor"`, `"rider"`, or
// `"boundary"`; every other SDK part type (e.g. `step-start`, `subtask`,
// `agent`, ...) is `"skip"`, so an invisible part can't silently split an
// otherwise-contiguous Explored run. `"anchor"` parts (fold-in tools) drive
// an Explored group; `"rider"` parts (reasoning) fold in alongside but can't
// justify a group on their own.
function classifyPart(part: Part): PartClassification {
  if (part.type === "reasoning") return "rider";
  if (part.type === "tool") {
    return isFoldInTool(part.tool) ? "anchor" : "boundary";
  }
  if (part.type === "text") return "boundary";
  return "skip";
}
