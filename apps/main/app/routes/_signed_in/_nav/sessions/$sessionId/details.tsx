import type { QueryRowType } from "@rocicorp/zero";
import type { ReactNode } from "react";

import {
  CheckIcon,
  ClockIcon,
  GitPullRequestIcon,
} from "@phosphor-icons/react";
import { useRef } from "react";
import invariant from "tiny-invariant";
import { z } from "zod";

import type { queries } from "#zero/queries.js";

import ClaudeMark from "#assets/claude-mark.svg?react";
import { RelativeTime } from "#components/relative-time.js";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import { getModelLabel } from "#lib/opencode/models.js";
import { cn } from "#lib/utils/cn.js";
import { getInitials } from "#lib/utils/get-initials.js";
import { useRootLoaderData } from "#root.js";

import { PreviewDetails } from "./preview-details.js";

const opencodeTodoSchema = z.object({
  content: z.string(),
  status: z.string(),
});
const opencodeTodosSchema = z.array(opencodeTodoSchema);

type OpencodeTodo = z.infer<typeof opencodeTodoSchema>;
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

  const modelLabel = getModelLabel(session.model);
  const todos = opencodeTodosSchema.safeParse(session.todos).data ?? [];

  return (
    <aside className={cn("flex flex-col gap-6 text-xs", className)}>
      <div className="text-muted-foreground flex flex-col gap-3">
        <DetailRow>
          <Avatar className="size-4">
            <AvatarImage
              alt={user.displayName}
              src={user.avatarUrl ?? undefined}
            />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <span className="truncate">1 prompt engineer</span>
        </DetailRow>

        <DetailRow>
          <ClockIcon className="size-4" />
          <span className="truncate">
            <RelativeTime timestampMs={session.lastUserMessageAt} />
          </span>
        </DetailRow>

        <DetailRow>
          <ClaudeMark className="size-4" />
          <span className="truncate">{modelLabel}</span>
        </DetailRow>

        <SessionPullRequestLink session={session} />

        <PreviewDetails session={session} />
      </div>

      {todos.length > 0 && <TodoDetails todos={todos} />}
    </aside>
  );
}

function DetailRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function SessionPullRequestLink({ session }: { session: SessionRow }) {
  // The parent route remounts `Details` on session change via `key`, so this
  // captures whether the PR was already present when the user landed on this
  // session — allowing us to animate only when one *appears* mid-session.
  const hadPrOnMountRef = useRef(session.prNumber !== null);

  if (session.prNumber === null) return null;

  return (
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
  );
}

function TodoDetails({ todos }: { todos: OpencodeTodo[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold">Todos</h2>
      <ul className="flex flex-col gap-3">
        {todos.map((todo, index) => (
          <TodoItem key={index} todo={todo} />
        ))}
      </ul>
    </div>
  );
}

function TodoItem({ todo }: { todo: OpencodeTodo }) {
  const isCompleted = todo.status === "completed";
  const isInProgress = todo.status === "in_progress";

  return (
    <li className="flex items-start gap-2">
      {isInProgress ? (
        <ClockIcon className="size-4 shrink-0" />
      ) : (
        <span
          className={cn(
            "border-input flex size-4 shrink-0 items-center justify-center rounded-xs border",
            isCompleted && "border-muted-foreground text-muted-foreground",
          )}
        >
          {isCompleted && <CheckIcon className="size-3" weight="bold" />}
        </span>
      )}
      <span className={cn(isCompleted && "text-muted-foreground line-through")}>
        {todo.content}
      </span>
    </li>
  );
}
