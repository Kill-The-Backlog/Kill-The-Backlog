import type { Octokit } from "@octokit/rest";

// Creates a draft pull request from the session's feature branch into the
// user's chosen base branch. Separate from any DB bookkeeping so the
// caller can decide whether to create a PR at all (e.g., only when
// `Session.prNumber` is not yet set) and how to persist the result.
export async function createDraftPR({
  base,
  body,
  head,
  octokit,
  repoFullName,
  title,
}: {
  base: string;
  body: string;
  head: string;
  octokit: Octokit;
  repoFullName: string;
  title: string;
}): Promise<{ number: number }> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repoFullName: ${repoFullName}`);
  }

  const pr = await octokit.rest.pulls.create({
    base,
    body,
    draft: true,
    head,
    owner,
    repo,
    title,
  });

  return { number: pr.data.number };
}
