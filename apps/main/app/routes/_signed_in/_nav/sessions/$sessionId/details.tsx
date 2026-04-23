import type { QueryRowType } from "@rocicorp/zero";

import { GitPullRequestIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import invariant from "tiny-invariant";

import type { queries } from "#zero/queries.js";

import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
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
        <span>1 prompt engineer</span>
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
