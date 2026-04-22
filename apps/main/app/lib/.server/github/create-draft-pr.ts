import type { Octokit } from "@octokit/rest";

// Creates a draft pull request from the session's feature branch into the
// repository's default branch. Separate from any DB bookkeeping so the
// caller can decide whether to create a PR at all (e.g., only when
// `Session.prNumber` is not yet set) and how to persist the result.
export async function createDraftPR({
  body,
  head,
  octokit,
  repoFullName,
  title,
}: {
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

  // The default branch is the only reliable `base` — repos rename `main`
  // vs `master` routinely and we shouldn't assume one. Fetching it once per
  // session is cheap and avoids a 422 if we guessed wrong.
  const repoInfo = await octokit.rest.repos.get({ owner, repo });
  const base = repoInfo.data.default_branch;

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
