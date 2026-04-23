import type { QueryRowType } from "@rocicorp/zero";

import type { queries } from "#zero/queries.js";

import { Alert, AlertDescription } from "#components/ui/alert.js";
import { useStickyScroll } from "#hooks/use-sticky-scroll.js";
import { cn } from "#lib/utils/cn.js";

import type { TimelineItem } from "./timeline.js";

import { PartRenderer } from "./part-renderer.js";
import { buildTimeline } from "./timeline.js";
import { ToolGroup } from "./tool-group.js";
import { UserPrompt } from "./user-prompt.js";

type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

export function Messages({
  className,
  session,
}: {
  className?: string;
  session: SessionRow;
}) {
  const timeline = buildTimeline(session.messages);
  const contentRef = useStickyScroll<HTMLDivElement>();

  return (
    <div
      className={cn("flex flex-col gap-3 text-sm", className)}
      ref={contentRef}
    >
      {timeline.map(renderTimelineItem)}

      {session.errorMessage && (
        <Alert className="mt-3" variant="destructive">
          <AlertDescription>{session.errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function renderTimelineItem(item: TimelineItem) {
  switch (item.kind) {
    case "group":
      return <ToolGroup key={item.keyId} parts={item.parts} />;
    case "part":
      return <PartRenderer key={item.part.id} part={item.part} />;
    case "user":
      return <UserPrompt key={item.message.id} message={item.message} />;
  }
}
