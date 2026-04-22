import invariant from "tiny-invariant";

// The e2bdev/base image runs commands as the non-root `user` account with
// `/home/user` as its home directory. Repos are cloned into a subdirectory
// here so opencode's session (rooted at the same path) can see them without
// extra configuration. Centralized here so the bootstrapper (clone) and the
// event pump (commit/push) agree on the same path.
export const SANDBOX_HOME_DIR = "/home/user";

export function clonePathForRepo(repoFullName: string): string {
  const repoName = repoFullName.split("/")[1];
  invariant(repoName, `Invalid repoFullName: ${repoFullName}`);
  return `${SANDBOX_HOME_DIR}/${repoName}`;
}
