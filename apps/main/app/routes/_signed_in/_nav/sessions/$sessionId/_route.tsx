import { data } from "react-router";
import invariant from "tiny-invariant";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";

import type { Route } from "./+types/_route";

export const loader = async ({ context, params }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);
  const sessionId = params.sessionId;
  invariant(sessionId, "Session ID is required");

  const session = await db
    .selectFrom("Session")
    .select(["id", "prompt", "createdAt"])
    .where("id", "=", sessionId)
    .where("userId", "=", user.id)
    .executeTakeFirst();

  if (!session) {
    throw data({ error: "Session not found" }, { status: 404 });
  }

  return { session };
};

export default function Route({ loaderData }: Route.ComponentProps) {
  const { session } = loaderData;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-muted-foreground text-sm">{session.prompt}</p>
    </div>
  );
}
