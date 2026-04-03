import type { Selectable } from "@ktb/db/kysely-types";
import type { GitHubRepo } from "@ktb/db/types";

import { GithubLogoIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import { PrivateBadge } from "#components/private-badge.js";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import { Button } from "#components/ui/button.js";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components/ui/empty.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";

import type { Route } from "./+types/_route";

export const loader = async ({ context, request }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const forceEmpty = new URL(request.url).searchParams.has("empty");
  if (forceEmpty) {
    return { repos: [] };
  }

  const repos = await db
    .selectFrom("GitHubRepo")
    .select([
      "id",
      "name",
      "fullName",
      "ownerLogin",
      "ownerAvatarUrl",
      "description",
      "htmlUrl",
      "isPrivate",
    ])
    .where("userId", "=", user.id)
    .orderBy("name", "asc")
    .execute();

  return { repos };
};

type Repo = Pick<
  Selectable<GitHubRepo>,
  | "description"
  | "fullName"
  | "htmlUrl"
  | "id"
  | "isPrivate"
  | "name"
  | "ownerAvatarUrl"
  | "ownerLogin"
>;

export default function Route({ loaderData }: Route.ComponentProps) {
  const { repos } = loaderData;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Repositories</h1>
        <Button asChild>
          <Link to="/repos/add">
            <PlusIcon data-icon="inline-start" />
            Add repo
          </Link>
        </Button>
      </div>

      {repos.length === 0 ? <EmptyState /> : <RepoList repos={repos} />}
    </div>
  );
}

function EmptyState() {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GithubLogoIcon />
        </EmptyMedia>
        <EmptyTitle>No repositories yet</EmptyTitle>
        <EmptyDescription>
          Add a GitHub repository to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/repos/add">
            <PlusIcon data-icon="inline-start" />
            Add repo
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function RepoList({ repos }: { repos: Repo[] }) {
  return (
    <ul className="divide-border divide-y">
      {repos.map((repo) => (
        <RepoRow key={repo.id} repo={repo} />
      ))}
    </ul>
  );
}

function RepoRow({ repo }: { repo: Repo }) {
  return (
    <li>
      <Link
        className="flex items-start gap-3 py-3 transition-colors hover:bg-muted/50"
        to={`/${repo.ownerLogin}/${repo.name}`}
      >
        <Avatar className="mt-0.5" size="sm">
          <AvatarImage
            alt={repo.ownerLogin}
            src={repo.ownerAvatarUrl ?? undefined}
          />
          <AvatarFallback>{repo.ownerLogin[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {repo.fullName}
            </span>
            {repo.isPrivate && <PrivateBadge />}
          </div>
          {repo.description && (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {repo.description}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
