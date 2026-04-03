import { data, Outlet } from "react-router";
import invariant from "tiny-invariant";

import type { BreadcrumbHandle } from "#lib/route-handle.js";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";

import type { Route } from "./+types/_route";

import { KanbanBoard } from "./kanban-board";

export const handle: BreadcrumbHandle<Route.ComponentProps["loaderData"]> = {
  breadcrumb: (loaderData) => ({
    label: loaderData.repo.fullName,
    to: `/repos/${loaderData.repo.id}`,
  }),
};

export const loader = async ({ context, params }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const repoId = params.repoId;
  invariant(repoId, "repoId is required");

  const repo = await db
    .selectFrom("GitHubRepo")
    .select(["id", "fullName"])
    .where("id", "=", Number(repoId))
    .where("userId", "=", user.id)
    .executeTakeFirst();

  if (!repo) {
    throw data({ error: "Repository not found" }, { status: 404 });
  }

  return { repo };
};

export default function Route() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <KanbanBoard />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
