import { data } from "react-router";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { formatError } from "#lib/.server/format-error.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { PREVIEW_STATUS } from "#lib/session-preview.js";
import { sessionPreviewStarterWorker } from "#workers/.server/session-preview-starter/index.js";

import type { Route } from "./+types/_route";

export const action = async ({ context, params }: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const sessionId = params.sessionId;

  const session = await db
    .selectFrom("Session")
    .select(["e2bSandboxId", "previewStatus"])
    .where("id", "=", sessionId)
    .where("userId", "=", user.id)
    .executeTakeFirst();
  if (!session) {
    throw data({ error: "Session not found" }, { status: 404 });
  }
  if (!session.e2bSandboxId) {
    throw data(
      { error: "Session has not finished bootstrapping" },
      { status: 409 },
    );
  }
  if (
    session.previewStatus === PREVIEW_STATUS.starting ||
    session.previewStatus === PREVIEW_STATUS.restarting
  ) {
    return data({ error: "Preview is already starting" }, { status: 409 });
  }

  await queryPatchSession(sessionId, {
    previewErrorMessage: null,
    previewStatus: PREVIEW_STATUS.restarting,
  });

  try {
    await sessionPreviewStarterWorker.enqueue(
      { sessionId },
      { jobId: sessionId, replaceFinished: true },
    );
    return data({ ok: true });
  } catch (error) {
    const message = formatError(error);
    await queryPatchSession(sessionId, {
      previewErrorMessage: message,
      previewStatus: PREVIEW_STATUS.failed,
    });
    return data({ error: message }, { status: 500 });
  }
};
