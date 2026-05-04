import type { QueryRowType } from "@rocicorp/zero";

import type { queries } from "#zero/queries.js";

import ClaudeMark from "#assets/claude-mark.svg?react";
import { Alert, AlertDescription } from "#components/ui/alert.js";
import { Avatar, AvatarFallback } from "#components/ui/avatar.js";
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

function AgentRow({
  children,
  showAvatar = false,
}: {
  children: React.ReactNode;
  showAvatar?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {/* The slot always reserves its width so every agent row — text,
          reasoning, tools, Explored groups — lines up flush with the text
          card's left edge, whether or not the Claude mark is shown. */}
      <div className="w-6 shrink-0">
        {showAvatar && (
          <Avatar size="sm">
            <AvatarFallback>
              <ClaudeMark className="size-3.5" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function renderTimelineItem(item: TimelineItem) {
  switch (item.kind) {
    case "group":
      return (
        <AgentRow key={item.keyId}>
          <ToolGroup parts={item.parts} />
        </AgentRow>
      );
    case "part":
      return (
        <AgentRow key={item.part.id} showAvatar={item.part.type === "text"}>
          <PartRenderer part={item.part} />
        </AgentRow>
      );
    case "user":
      return <UserPrompt key={item.message.id} message={item.message} />;
  }
}
