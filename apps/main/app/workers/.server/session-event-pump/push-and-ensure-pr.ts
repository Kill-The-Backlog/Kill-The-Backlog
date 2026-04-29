import type { Octokit } from "@octokit/rest";
import type { Job } from "bullmq";
import type { Sandbox } from "e2b";

import { db } from "#lib/.server/clients/db.js";
import { formatError } from "#lib/.server/format-error.js";
import { createDraftPR } from "#lib/.server/github/create-draft-pr.js";
import { pushSessionBranch } from "#lib/.server/sandbox-git/push-branch.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";

// Called by the event pump AFTER every successful per-turn commit. Pushes
// the branch to origin and — on the first commit of a session — opens a
// draft PR. Subsequent calls are fast: git push sends only the new pack,
// and PR creation short-circuits once `currentPrNumber` is non-null.
//
// Failures always set `Session.errorMessage`. Unlike the cleanup-path
// helpers that guard against clobbering upstream errors, this runs inside
// the pump's hot loop where a prior errorMessage is just stale state from
// a previous turn — overwriting it reflects the latest git state.
//
// Returns the PR number to use on the next invocation. Callers thread this
// value through a local mutable `let` so they don't need to re-query the
// DB on every commit.
export async function pushAndEnsurePR({
  baseBranch,
  branchName,
  clonePath,
  currentPrNumber,
  job,
  oauthAccessToken,
  octokit,
  repoFullName,
  sandbox,
  sessionId,
}: {
  baseBranch: string;
  branchName: string;
  clonePath: string;
  currentPrNumber: null | number;
  job: Job;
  oauthAccessToken: string;
  octokit: Octokit;
  repoFullName: string;
  sandbox: Sandbox;
  sessionId: string;
}): Promise<null | number> {
  const recordError = async (message: string): Promise<void> => {
    await queryPatchSession(sessionId, { errorMessage: message });
    await job.log(message);
  };

  try {
    await pushSessionBranch({
      branchName,
      clonePath,
      oauthAccessToken,
      sandbox,
    });
    await job.log(`[push] ok sessionId=${sessionId} branch=${branchName}`);
  } catch (error) {
    await recordError(`Push failed: ${formatError(error)}`);
    return currentPrNumber;
  }

  // PR creation is once per session and idempotent via Session.prNumber.
  // Subsequent commits skip this branch entirely.
  if (currentPrNumber !== null) return currentPrNumber;

  // `title` may have been filled in by the titler worker during the pump,
  // so we read it fresh here rather than reusing whatever was in memory at
  // pump start. Falling back to the truncated initial prompt keeps the PR
  // readable even if the titler hasn't finished yet.
  const sessionMeta = await db
    .selectFrom("Session")
    .select(["initialPrompt", "title"])
    .where("id", "=", sessionId)
    .executeTakeFirst();
  const title =
    sessionMeta?.title ??
    (sessionMeta?.initialPrompt ?? "Kill The Backlog session").slice(0, 72);
  const body = [
    "Opened automatically by Kill The Backlog.",
    "",
    "**Initial prompt**",
    "",
    `> ${sessionMeta?.initialPrompt ?? ""}`,
  ].join("\n");

  try {
    const pr = await createDraftPR({
      base: baseBranch,
      body,
      head: branchName,
      octokit,
      repoFullName,
      title,
    });
    await queryPatchSession(sessionId, { prNumber: pr.number });
    await job.log(`[pr] opened sessionId=${sessionId} pr=#${pr.number}`);
    return pr.number;
  } catch (error) {
    await recordError(`Draft PR failed: ${formatError(error)}`);
    return currentPrNumber;
  }
}
