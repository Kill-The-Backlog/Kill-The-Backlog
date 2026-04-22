import type { Part } from "@opencode-ai/sdk/v2";
import type { Job } from "bullmq";
import type { Sandbox } from "e2b";

import { db } from "#lib/.server/clients/db.js";
import { formatError } from "#lib/.server/format-error.js";
import { commitTurn } from "#lib/.server/sandbox-git/commit-turn.js";

// Called by the event pump on every busy|retry → idle transition. Reads the
// prompt that kicked off this turn from our DB (already persisted via the
// message stream), runs `commitTurn`, and logs the outcome. Never throws —
// a commit failure mustn't abort the pump. The working tree still holds any
// changes, so the next idle will re-attempt naturally.
//
// Returns `true` when a new commit was created — the caller uses this to
// trigger push + PR work immediately afterwards. `false` covers both the
// "no changes to commit" no-op and the "commit threw" failure path.
export async function tryCommitTurn({
  clonePath,
  job,
  sandbox,
  sessionId,
}: {
  clonePath: string;
  job: Job;
  sandbox: Sandbox;
  sessionId: string;
}): Promise<boolean> {
  const userPrompt = await fetchLatestUserPrompt(sessionId);
  if (!userPrompt) {
    await job.log(`[commit] skipped: no user prompt recorded yet`);
    return false;
  }

  try {
    const result = await commitTurn({ clonePath, sandbox, userPrompt });
    if (result.committed) {
      await job.log(`[commit] ${result.message}`);
      return true;
    }
    await job.log(`[commit] skipped: no staged changes`);
    return false;
  } catch (error) {
    await job.log(`[commit] failed: ${formatError(error)}`);
    return false;
  }
}

// Returns the text of the latest user-role message for the session, or null
// if the session hasn't received one yet (e.g. pump armed before the initial
// prompt propagated). The `type = "text"` column filter narrows the stored
// Part JSON to the text variant, letting us read `data.text` directly.
async function fetchLatestUserPrompt(
  sessionId: string,
): Promise<null | string> {
  const row = await db
    .selectFrom("SessionMessage")
    .innerJoin(
      "SessionMessagePart",
      "SessionMessagePart.messageId",
      "SessionMessage.id",
    )
    .select(["SessionMessagePart.data"])
    .where("SessionMessage.sessionId", "=", sessionId)
    .where("SessionMessage.role", "=", "user")
    .where("SessionMessagePart.type", "=", "text")
    .orderBy("SessionMessage.opencodeCreatedAt", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!row) return null;
  const part = row.data as Part;
  return part.type === "text" ? part.text : null;
}
