import { data } from "react-router";
import { z } from "zod";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { cardRunWorker } from "#workers/.server/card-run.js";

import type { Route } from "./+types/_route.js";

const requestSchema = z.object({
  cardId: z.uuid(),
});

export async function action({ context, request }: Route.ActionArgs) {
  const { user } = await requireUser(context);

  const body: unknown = await request.json();
  const { cardId } = requestSchema.parse(body);

  const card = await db
    .selectFrom("KanbanCard")
    .innerJoin("GitHubRepo", "GitHubRepo.id", "KanbanCard.repoId")
    .select("KanbanCard.repoId")
    .where("KanbanCard.id", "=", cardId)
    .where("GitHubRepo.userId", "=", user.id)
    .executeTakeFirst();

  if (!card) {
    throw data({ error: "Card not found" }, { status: 404 });
  }

  const runId = crypto.randomUUID();

  await db
    .insertInto("CardRun")
    .values({
      cardId,
      id: runId,
      repoId: card.repoId,
      updatedAt: new Date(),
      userId: user.id,
    })
    .execute();

  await cardRunWorker.enqueue(
    {
      repoId: card.repoId,
      runId,
      userId: user.id,
    },
    { jobId: runId },
  );

  return { runId };
}
