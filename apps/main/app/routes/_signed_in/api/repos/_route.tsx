import type { Octokit } from "@octokit/rest";

import { data } from "react-router";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { getUserOctokit } from "#lib/.server/github/octokit.js";

import type { Route } from "./+types/_route";

export type GitHubRepoItem = {
  defaultBranch: string;
  description: null | string;
  fullName: string;
  githubRepoId: number;
  htmlUrl: string;
  isPrivate: boolean;
  name: string;
  ownerAvatarUrl: string;
  ownerLogin: string;
};

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const octokit = await getUserOctokit(user.id);
  if (!octokit) {
    throw data({ error: "GitHub account not linked" }, { status: 422 });
  }

  const repos = await fetchAllUserRepos(octokit);
  return { repos };
};

async function fetchAllUserRepos(octokit: Octokit): Promise<GitHubRepoItem[]> {
  const githubRepos = await octokit.paginate(
    octokit.rest.repos.listForAuthenticatedUser,
    { per_page: 100, sort: "updated" },
  );

  return githubRepos.map((repo) => ({
    defaultBranch: repo.default_branch,
    description: repo.description,
    fullName: repo.full_name,
    githubRepoId: repo.id,
    htmlUrl: repo.html_url,
    isPrivate: repo.private,
    name: repo.name,
    ownerAvatarUrl: repo.owner.avatar_url,
    ownerLogin: repo.owner.login,
  }));
}
