import type { Selectable } from "@ktb/db/kysely-types";
import type { GitHubRepo } from "@ktb/db/types";
import type { Octokit } from "@octokit/rest";

import {
  ArrowLeftIcon,
  CheckIcon,
  GithubLogoIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Suspense, useState } from "react";
import { Await, data, Link, redirect, useFetcher } from "react-router";
import { z } from "zod";

import { PrivateBadge } from "#components/private-badge.js";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import { Button } from "#components/ui/button.js";
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
import { db } from "#lib/.server/clients/db.js";
import { getUserOctokit } from "#lib/.server/github/octokit.js";

import type { Route } from "./+types/_route";

const requestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const octokit = await getUserOctokit(user.id);
  if (!octokit) {
    throw data({ error: "GitHub account not linked" }, { status: 400 });
  }

  const repos = buildRepoList(octokit, user.id);

  return { repos };
};

async function buildRepoList(octokit: Octokit, userId: number) {
  const [githubRepos, addedRepos] = await Promise.all([
    fetchAllUserRepos(octokit),
    db
      .selectFrom("GitHubRepo")
      .select("githubRepoId")
      .where("userId", "=", userId)
      .execute(),
  ]);

  const addedIds = new Set(addedRepos.map((r) => r.githubRepoId));

  return githubRepos.map((repo) => ({
    added: addedIds.has(repo.id),
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

async function fetchAllUserRepos(octokit: Octokit) {
  return octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
  });
}

export const action = async ({ context, request }: Route.ActionArgs) => {
  const { user } = await requireUser(context);

  const formData = await request.formData();
  const { owner, repo: repoName } = requestSchema.parse({
    owner: formData.get("owner"),
    repo: formData.get("repo"),
  });

  const octokit = await getUserOctokit(user.id);
  if (!octokit) {
    throw data({ error: "GitHub account not linked" }, { status: 400 });
  }

  const { data: repo } = await octokit.rest.repos.get({
    owner,
    repo: repoName,
  });

  await db
    .insertInto("GitHubRepo")
    .values({
      defaultBranch: repo.default_branch,
      description: repo.description,
      fullName: repo.full_name,
      githubRepoId: repo.id,
      htmlUrl: repo.html_url,
      isPrivate: repo.private,
      name: repo.name,
      ownerAvatarUrl: repo.owner.avatar_url,
      ownerLogin: repo.owner.login,
      updatedAt: new Date(),
      userId: user.id,
    })
    .execute();

  return redirect(`/${owner}/${repoName}`);
};

type AddableRepo = Pick<
  Selectable<GitHubRepo>,
  | "defaultBranch"
  | "description"
  | "fullName"
  | "githubRepoId"
  | "htmlUrl"
  | "isPrivate"
  | "name"
  | "ownerAvatarUrl"
  | "ownerLogin"
> & {
  added: boolean;
};

export default function Route({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link to="/">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Add a repository</h1>
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

function AddRepoRow({ repo }: { repo: AddableRepo }) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const isAdded = repo.added;

  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar size="sm">
        <AvatarImage
          alt={repo.ownerLogin}
          src={repo.ownerAvatarUrl ?? undefined}
        />
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
      <div className="shrink-0">
        {isAdded ? (
          <Button disabled size="sm" variant="ghost">
            <CheckIcon data-icon="inline-start" />
            Added
          </Button>
        ) : (
          <fetcher.Form method="POST">
            <input name="owner" type="hidden" value={repo.ownerLogin} />
            <input name="repo" type="hidden" value={repo.name} />
            <Button
              disabled={isSubmitting}
              size="sm"
              type="submit"
              variant="outline"
            >
              <PlusIcon data-icon="inline-start" />
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </fetcher.Form>
        )}
      </div>
    </li>
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

function FilterableRepoList({ repos }: { repos: AddableRepo[] }) {
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
            <AddRepoRow key={repo.githubRepoId} repo={repo} />
          ))}
        </ul>
      )}
    </>
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
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
