import { zql } from "@ktb/db/zero";
import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type {} from "./context.js";

//
// -----------------------------------------------------------------------------
// !IMPORTANT
// -----------------------------------------------------------------------------
//
// `zero` doesn't allow us to select individual columns from a table. All
// columns are synchronized to the client.
//
// @todo: We need to either create zero-specific tables or a postgres
// publication that limits the replicated columns to only the ones we need.
//

export const queries = defineQueries({
  cardRuns: {
    latestByCard: defineQuery(
      z.object({ cardId: z.string() }),
      ({ args: { cardId }, ctx }) =>
        zql.CardRun.where("cardId", cardId)
          .whereExists("repo", (q) => q.where("userId", ctx.userId))
          .orderBy("createdAt", "desc")
          .one(),
    ),
  },

  kanbanCards: {
    byNumber: defineQuery(
      z.object({ number: z.number(), repoId: z.number() }),
      ({ args: { number, repoId }, ctx }) =>
        zql.KanbanCard.where("repoId", repoId)
          .where("number", number)
          .whereExists("repo", (q) => q.where("userId", ctx.userId))
          .related("user")
          .one(),
    ),

    byRepo: defineQuery(
      z.object({ repoId: z.number() }),
      ({ args: { repoId }, ctx }) =>
        zql.KanbanCard.where("repoId", repoId)
          .whereExists("repo", (q) => q.where("userId", ctx.userId))
          .related("user")
          .orderBy("sortOrder", "asc"),
    ),
  },
});
