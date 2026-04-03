import { useMemo } from "react";
import { data, Outlet } from "react-router";

import type { BreadcrumbHandle } from "#lib/route-handle.js";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";

import type { Route } from "./+types/_route";

import { KanbanBoard } from "./kanban-board";

export type RepoOutletContext = { repoId: number };

export const handle: BreadcrumbHandle<Route.ComponentProps["loaderData"]> = {
  breadcrumb: ({ repo }) => ({
    label: repo.fullName,
    to: `/${repo.ownerLogin}/${repo.name}`,
  }),
};

export const loader = async ({ context, params }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const { repoName, repoOwner } = params;

  const repo = await db
    .selectFrom("GitHubRepo")
    .select(["id", "fullName", "ownerLogin", "name"])
    .where("ownerLogin", "=", repoOwner)
    .where("name", "=", repoName)
    .where("userId", "=", user.id)
    .executeTakeFirst();

  if (!repo) {
    throw data({ error: "Repository not found" }, { status: 404 });
  }

  return { repo };
};

export default function Route({ loaderData }: Route.ComponentProps) {
  const outletContext: RepoOutletContext = useMemo(
    () => ({ repoId: loaderData.repo.id }),
    [loaderData.repo.id],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <KanbanBoard repoId={loaderData.repo.id} />
        </div>
        <Outlet context={outletContext} />
      </div>
    </div>
  );
}
