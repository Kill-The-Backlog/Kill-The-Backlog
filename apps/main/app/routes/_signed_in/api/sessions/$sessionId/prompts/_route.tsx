import { data } from "react-router";
import invariant from "tiny-invariant";
import { z } from "zod";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { dispatchPrompt } from "#lib/.server/sessions/dispatch-prompt.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";

import type { Route } from "./+types/_route";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export type SendSessionPromptBody = z.infer<typeof requestSchema>;

export const action = async ({
  context,
  params,
  request,
}: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const sessionId = params.sessionId;

  const session = await db
    .selectFrom("Session")
    .select(["id", "e2bSandboxId", "model", "opencodeSessionId"])
    .where("id", "=", sessionId)
    .where("userId", "=", user.id)
    .executeTakeFirst();
  if (!session) {
    throw data({ error: "Session not found" }, { status: 404 });
  }

  const body: unknown = await request.json();
  const result = requestSchema.safeParse(body);
  if (!result.success) {
    return data(
      { error: result.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  invariant(
    session.e2bSandboxId && session.opencodeSessionId,
    `Session ${sessionId} has not finished bootstrapping`,
  );

  // A follow-up submission is the user's "retry" signal, so wipe any prior
  // `errorMessage` before we attempt again — otherwise a stale error would
  // keep showing in the UI and, more importantly, future runs treat it as
  // the session's live error state. If this attempt fails, the pump /
  // `session.error` handlers will record a fresh message.
  await queryPatchSession(sessionId, {
    errorMessage: null,
    opencodeStatus: "busy",
  });

  await dispatchPrompt({
    e2bSandboxId: session.e2bSandboxId,
    modelSelection: session.model,
    opencodeSessionId: session.opencodeSessionId,
    sessionId,
    text: result.data.prompt,
  });

  return data({ ok: true });
};
