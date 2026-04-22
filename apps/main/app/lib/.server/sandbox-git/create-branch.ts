import type { Sandbox } from "e2b";

// Creates and checks out the session's feature branch inside the freshly
// cloned repo. Called once at bootstrap, BEFORE opencode starts writing, so
// every file the agent touches lands on the session branch and never on
// whatever default branch we cloned from.
export async function createSessionBranch({
  branchName,
  clonePath,
  sandbox,
}: {
  branchName: string;
  clonePath: string;
  sandbox: Sandbox;
}): Promise<void> {
  await sandbox.git.createBranch(clonePath, branchName);
}
