import { useQuery } from "@rocicorp/zero/react";
import { Navigate } from "react-router";

import { Alert, AlertDescription } from "#components/ui/alert.js";
import { Spinner } from "#components/ui/spinner.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { Message } from "./message.js";
import { UserPrompt } from "./user-prompt.js";

export default function Route({ params }: Route.ComponentProps) {
  const [session, sessionResult] = useQuery(
    queries.sessions.one({ id: params.sessionId }),
  );

  if (!session && sessionResult.type === "complete") {
    return <Navigate replace to="/sessions" />;
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <UserPrompt prompt={session.prompt} />

      {session.messages.length > 0 && (
        <div className="flex flex-col gap-3">
          {session.messages
            .filter((m) => m.role === "assistant")
            .map((message) => (
              <Message key={message.id} message={message} />
            ))}
        </div>
      )}

      {session.errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{session.errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
