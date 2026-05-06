import { data } from "react-router";
import invariant from "tiny-invariant";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { formatError } from "#lib/.server/format-error.js";
import { stopOpencodeSession } from "#lib/.server/opencode/stop-session.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";

import type { Route } from "./+types/_route";

export const action = async ({ context, params }: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const sessionId = params.sessionId;

  const session = await db
    .selectFrom("Session")
    .select(["id", "e2bSandboxId", "opencodeSessionId"])
    .where("id", "=", sessionId)
    .where("userId", "=", user.id)
    .executeTakeFirst();
  if (!session) {
    throw data({ error: "Session not found" }, { status: 404 });
  }

  invariant(
    session.e2bSandboxId && session.opencodeSessionId,
    `Session ${sessionId} has not finished bootstrapping`,
  );

  try {
    await stopOpencodeSession({
      e2bSandboxId: session.e2bSandboxId,
      opencodeSessionId: session.opencodeSessionId,
    });
    await queryPatchSession(sessionId, { opencodeStatus: "idle" });
    return data({ ok: true });
  } catch (error) {
    return data({ error: formatError(error) }, { status: 500 });
  }
};
