import type { QueryRowType } from "@rocicorp/zero";

import { GitPullRequestIcon } from "@phosphor-icons/react";
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
          className="animate-in fade-in-0 flex items-center gap-2 duration-500 hover:underline"
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
