import { ArrowLeftIcon } from "@phosphor-icons/react";
import { data, Link } from "react-router";
import invariant from "tiny-invariant";

import { KanbanBoard } from "#components/kanban-board.js";
import { Button } from "#components/ui/button.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";

import type { Route } from "./+types/_route";

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

export default function Route({ loaderData }: Route.ComponentProps) {
  const { repo } = loaderData;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-3 border-b px-4 py-3">
        <Button asChild size="icon" variant="ghost">
          <Link to="/repos">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <h1 className="font-heading text-sm font-semibold tracking-tight">
          {repo.fullName}
        </h1>
      </div>
      <div className="min-h-0 flex-1">
        <KanbanBoard />
      </div>
    </div>
  );
}
