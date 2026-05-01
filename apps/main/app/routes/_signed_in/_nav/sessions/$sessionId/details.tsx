import type { QueryRowType } from "@rocicorp/zero";

import { ClockIcon, GitPullRequestIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";

import type { queries } from "#zero/queries.js";

import ClaudeMark from "#assets/claude-mark.svg?react";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import { getModelLabel } from "#lib/opencode/models.js";
import { cn } from "#lib/utils/cn.js";
import { getInitials } from "#lib/utils/get-initials.js";
import { useRootLoaderData } from "#root.js";

type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

export function Details({
  className,
  session,
}: {
  className?: string;
  session: SessionRow;
}) {
  const { user } = useRootLoaderData();
  invariant(user, "User is required");

  // The parent route remounts `Details` on session change via `key`, so this
  // captures whether the PR was already present when the user landed on this
  // session — allowing us to animate only when one *appears* mid-session.
  const hadPrOnMountRef = useRef(session.prNumber !== null);

  const modelLabel = getModelLabel(session.model);

  return (
    <aside
      className={cn(
        "text-muted-foreground flex flex-col gap-3 text-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar className="size-4">
          <AvatarImage
            alt={user.displayName}
            src={user.avatarUrl ?? undefined}
          />
          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
        </Avatar>
        <span className="truncate">1 prompt engineer</span>
      </div>

      <div className="flex items-center gap-2">
        <ClockIcon className="size-4" />
        <span className="truncate">
          <RelativeTime timestampMs={session.lastUserMessageAt} />
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ClaudeMark className="size-4" />
        <span className="truncate">{modelLabel}</span>
      </div>

      {session.prNumber !== null && (
        <a
          className={cn(
            "flex items-center gap-2 hover:underline",
            !hadPrOnMountRef.current && "animate-in fade-in-0 duration-500",
          )}
          href={`https://github.com/${session.repoFullName}/pull/${session.prNumber}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          <GitPullRequestIcon className="size-4" />
          <span className="truncate">
            {session.repoFullName} #{session.prNumber}
          </span>
        </a>
      )}
    </aside>
  );
}

function formatRelative(timestampMs: number): string {
  const diffMs = Math.max(0, Date.now() - timestampMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Compact relative-time label for the last-user-prompt row. Zero pushes
// re-render us instantly when `lastUserMessageAt` changes; between pushes,
// `RelativeTime` schedules a re-render at the next minute boundary derived
// from `timestampMs`, so the label flips precisely when its value changes
// (e.g. "5m" → "6m") rather than up to ~60s late. Each tick reschedules
// from `Date.now()`, so backgrounded tabs self-correct on resume. A negative
// diff (client clock behind the server) is clamped to "Now".
function RelativeTime({ timestampMs }: { timestampMs: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const elapsedMs = Math.max(0, Date.now() - timestampMs);
      const msUntilNextMinute = 60_000 - (elapsedMs % 60_000);
      timeoutId = setTimeout(() => {
        setTick((t) => t + 1);
        schedule();
      }, msUntilNextMinute);
    };

    schedule();
    return () => {
      clearTimeout(timeoutId);
    };
  }, [timestampMs]);

  return <>{formatRelative(timestampMs)}</>;
}
