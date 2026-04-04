import type { Transaction } from "@rocicorp/zero";

import { zql } from "@ktb/db/zero";
import { defineMutator, defineMutators } from "@rocicorp/zero";
import { z } from "zod";

import type {} from "./context.js";

// Authorization checks only run on the server where all data is available.
// On the client, the GitHubRepo table isn't synced so these reads would
// return null and block the optimistic update.

async function requireCardAccess(
  tx: Transaction,
  cardId: string,
  userId: number,
) {
  if (tx.location !== "server") return;
  const card = await tx.run(
    zql.KanbanCard.where("id", cardId)
      .whereExists("repo", (q) => q.where("userId", userId))
      .one(),
  );
  if (!card) throw new Error("Not found");
}

async function requireRepoAccess(
  tx: Transaction,
  repoId: number,
  userId: number,
) {
  if (tx.location !== "server") return;
  const repo = await tx.run(
    zql.GitHubRepo.where("id", repoId).where("userId", userId).one(),
  );
  if (!repo) throw new Error("Not found");
}

export const mutators = defineMutators({
  kanbanCards: {
    create: defineMutator(
      z.object({
        columnId: z.string(),
        id: z.string(),
        repoId: z.number(),
        sortOrder: z.string(),
        title: z.string(),
      }),
      async ({ args, ctx, tx }) => {
        await requireRepoAccess(tx, args.repoId, ctx.userId);

        const lastCard = await tx.run(
          zql.KanbanCard.where("repoId", args.repoId)
            .orderBy("number", "desc")
            .one(),
        );
        const number = (lastCard?.number ?? 0) + 1;

        const now = Date.now();
        await tx.mutate.KanbanCard.insert({
          ...args,
          createdAt: now,
          number,
          updatedAt: now,
          userId: ctx.userId,
        });
      },
    ),

    delete: defineMutator(
      z.object({ id: z.string() }),
      async ({ args: { id }, ctx, tx }) => {
        await requireCardAccess(tx, id, ctx.userId);

        await tx.mutate.KanbanCard.delete({ id });
      },
    ),

    move: defineMutator(
      z.object({
        columnId: z.string(),
        id: z.string(),
        sortOrder: z.string(),
      }),
      async ({ args: { columnId, id, sortOrder }, ctx, tx }) => {
        await requireCardAccess(tx, id, ctx.userId);

        await tx.mutate.KanbanCard.update({
          columnId,
          id,
          sortOrder,
          updatedAt: Date.now(),
        });
      },
    ),

    reorder: defineMutator(
      z.object({
        id: z.string(),
        sortOrder: z.string(),
      }),
      async ({ args: { id, sortOrder }, ctx, tx }) => {
        await requireCardAccess(tx, id, ctx.userId);

        await tx.mutate.KanbanCard.update({
          id,
          sortOrder,
          updatedAt: Date.now(),
        });
      },
    ),
  },
});
