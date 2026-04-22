import type { Sandbox } from "e2b";

// Pushes the session branch to origin with the linked GitHub account's
// OAuth token as the HTTPS password. `x-access-token` is GitHub's
// recommended basic-auth username for OAuth user tokens. `setUpstream` makes
// subsequent pushes from the same clone a simple `git push` and is a no-op
// if upstream is already configured. Fast no-op if the branch is already
// up to date, so it's safe to call on every pump pause.
export async function pushSessionBranch({
  branchName,
  clonePath,
  oauthAccessToken,
  sandbox,
}: {
  branchName: string;
  clonePath: string;
  oauthAccessToken: string;
  sandbox: Sandbox;
}): Promise<void> {
  await sandbox.git.push(clonePath, {
    branch: branchName,
    password: oauthAccessToken,
    setUpstream: true,
    username: "x-access-token",
  });
}
