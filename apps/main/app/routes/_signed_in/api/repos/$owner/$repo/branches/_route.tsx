import type { Octokit } from "@octokit/rest";

import { data } from "react-router";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { getUserOctokit } from "#lib/.server/github/octokit.js";

import type { Route } from "./+types/_route";

export type GitHubBranchItem = {
  name: string;
};

export const loader = async ({ context, params }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const octokit = await getUserOctokit(user.id);
  if (!octokit) {
    throw data({ error: "GitHub account not linked" }, { status: 422 });
  }

  const branches = await fetchAllRepoBranches(
    octokit,
    params.owner,
    params.repo,
  );
  return { branches };
};

async function fetchAllRepoBranches(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GitHubBranchItem[]> {
  const githubBranches = await octokit.paginate(
    octokit.rest.repos.listBranches,
    { owner, per_page: 100, repo },
  );

  return githubBranches.map((branch) => ({ name: branch.name }));
}
