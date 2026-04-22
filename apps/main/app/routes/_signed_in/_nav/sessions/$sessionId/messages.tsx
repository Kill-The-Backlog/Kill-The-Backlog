import type { QueryRowType } from "@rocicorp/zero";

import type { queries } from "#zero/queries.js";

import { Alert, AlertDescription } from "#components/ui/alert.js";
import { cn } from "#lib/utils.js";

import { Message } from "./message.js";
import { UserPrompt } from "./user-prompt.js";

type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

export function Messages({
  className,
  session,
}: {
  className?: string;
  session: SessionRow;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {session.messages.length > 0 &&
        session.messages.map((message) =>
          message.role === "user" ? (
            <UserPrompt key={message.id} message={message} />
          ) : (
            <Message key={message.id} message={message} />
          ),
        )}

      {session.errorMessage && (
        <Alert className="mt-3" variant="destructive">
          <AlertDescription>{session.errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
