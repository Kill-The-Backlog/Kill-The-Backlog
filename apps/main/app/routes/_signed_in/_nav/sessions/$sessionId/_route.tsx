import { useQuery } from "@rocicorp/zero/react";
import { Navigate } from "react-router";

import { Spinner } from "#components/ui/spinner.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

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
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-muted-foreground text-sm">{session.prompt}</p>
      {session.e2bSandboxId && (
        <p className="text-muted-foreground text-sm">
          Sandbox ID: {session.e2bSandboxId}
        </p>
      )}
    </div>
  );
}
