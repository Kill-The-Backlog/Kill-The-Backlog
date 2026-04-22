import type { Sandbox } from "e2b";

// Configures the cloned repo's git identity from the session owner's linked
// GitHub account. Scoped to `local` so we don't pollute any other repo that
// might live in the sandbox. The noreply email pattern is GitHub's own:
// using `{id}+{login}@users.noreply.github.com` keeps the user's real email
// off the commit and always validates as a real GitHub identity.
export async function configureGitIdentity({
  clonePath,
  githubId,
  login,
  sandbox,
}: {
  clonePath: string;
  githubId: number;
  login: string;
  sandbox: Sandbox;
}): Promise<void> {
  const name = login;
  const email = `${githubId}+${login}@users.noreply.github.com`;
  await sandbox.git.configureUser(name, email, {
    path: clonePath,
    scope: "local",
  });
}
