import type { Sandbox } from "e2b";

import type { CommitFileSummary } from "#lib/.server/sessions/generate-commit-message.js";

import { generateCommitMessage } from "#lib/.server/sessions/generate-commit-message.js";

// Result of a commit attempt. `committed: false` means the turn had no staged
// changes (pure Q&A turn) — we deliberately skip the commit AND the Haiku
// call in that case. Callers can treat this as a no-op success.
export type CommitTurnResult =
  | { committed: false }
  | { committed: true; message: string };

// Stages every change in the working tree, checks whether anything actually
// moved, and commits with a Haiku-generated subject. Identity comes from the
// repo-local git config set up at bootstrap, so we don't pass authorName /
// authorEmail here. Generating the commit message uses the user's prompt for
// this turn plus the file list (no patch content) — see
// `generate-commit-message.ts` for why.
export async function commitTurn({
  clonePath,
  sandbox,
  userPrompt,
}: {
  clonePath: string;
  sandbox: Sandbox;
  userPrompt: string;
}): Promise<CommitTurnResult> {
  await sandbox.git.add(clonePath, { all: true });

  const status = await sandbox.git.status(clonePath);
  if (!status.hasStaged) return { committed: false };

  const files: CommitFileSummary[] = status.fileStatus
    .filter((entry) => entry.staged)
    .map((entry) => ({ path: entry.name, status: entry.status }));

  const message = await generateCommitMessage({ files, userPrompt });
  await sandbox.git.commit(clonePath, message);

  return { committed: true, message };
}
