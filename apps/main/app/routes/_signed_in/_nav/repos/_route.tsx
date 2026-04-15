import type { Octokit } from "@octokit/rest";

import { GithubLogoIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Suspense, useState } from "react";
import { Await, data } from "react-router";

import { PrivateBadge } from "#components/private-badge.js";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components/ui/empty.js";
import { Input } from "#components/ui/input.js";
import { Skeleton } from "#components/ui/skeleton.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { getUserOctokit } from "#lib/.server/github/octokit.js";

import type { Route } from "./+types/_route";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const octokit = await getUserOctokit(user.id);
  if (!octokit) {
    throw data({ error: "GitHub account not linked" }, { status: 422 });
  }

  const repos = fetchAllUserRepos(octokit);

  return { repos };
};

type GitHubRepoItem = {
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

export default function Route({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Repositories</h1>
      </div>

      <Suspense
        fallback={
          <>
            <SearchInput disabled />
            <RepoListSkeleton />
          </>
        }
      >
        <Await resolve={loaderData.repos}>
          {(repos) => <FilterableRepoList repos={repos} />}
        </Await>
      </Suspense>
    </div>
  );
}

function EmptySearch({ search }: { search: string }) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GithubLogoIcon />
        </EmptyMedia>
        <EmptyTitle>
          {search ? "No matches" : "No repositories found"}
        </EmptyTitle>
        <EmptyDescription>
          {search
            ? "No repositories match your search."
            : "No repositories found on your GitHub account."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

async function fetchAllUserRepos(octokit: Octokit) {
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

function FilterableRepoList({ repos }: { repos: GitHubRepoItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = repos.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
      repo.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <SearchInput
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        value={search}
      />

      {filtered.length === 0 ? (
        <EmptySearch search={search} />
      ) : (
        <ul className="divide-border divide-y">
          {filtered.map((repo) => (
            <RepoRow key={repo.githubRepoId} repo={repo} />
          ))}
        </ul>
      )}
    </>
  );
}

function RepoRow({ repo }: { repo: GitHubRepoItem }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar size="sm">
        <AvatarImage alt={repo.ownerLogin} src={repo.ownerAvatarUrl} />
        <AvatarFallback>{repo.ownerLogin[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{repo.fullName}</span>
          {repo.isPrivate && <PrivateBadge />}
        </div>
        {repo.description && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {repo.description}
          </p>
        )}
      </div>
    </li>
  );
}

function SearchInput(
  props: Omit<React.ComponentProps<typeof Input>, "className" | "placeholder">,
) {
  return (
    <div className="relative mb-4">
      <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input className="pl-8" placeholder="Search repositories..." {...props} />
    </div>
  );
}

const SKELETON_NAME_WIDTHS = ["w-40", "w-56", "w-36", "w-48", "w-52", "w-44"];
const SKELETON_DESC_WIDTHS = ["w-64", "w-72", "w-56", "w-80", "w-60", "w-68"];

function RepoListSkeleton() {
  return (
    <div className="divide-border divide-y">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="flex items-center gap-3 py-3" key={i}>
          <Skeleton className="size-6 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={`h-4 ${SKELETON_NAME_WIDTHS[i]}`} />
            <Skeleton className={`h-3 ${SKELETON_DESC_WIDTHS[i]}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
