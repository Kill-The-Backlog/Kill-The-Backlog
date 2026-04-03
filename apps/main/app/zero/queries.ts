import { zql } from "@ktb/db/zero";
import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type {} from "./context.js";

//
// !IMPORTANT @todo
// `zero` doesn't allow us to select individual columns from a table. Everything
// gets synchronized to the client. We need to create a postgres publication
// that limits the columns replicated.
//

export const queries = defineQueries({
  kanbanCards: {
    byId: defineQuery(
      z.object({ cardId: z.string() }),
      ({ args: { cardId }, ctx }) =>
        zql.KanbanCard.where("id", cardId)
          .whereExists("repo", (q) => q.where("userId", ctx.userId))
          .related("user")
          .one(),
    ),

    byRepo: defineQuery(
      z.object({ repoId: z.number() }),
      ({ args: { repoId }, ctx }) =>
        zql.KanbanCard.where("repoId", repoId)
          .whereExists("repo", (q) => q.where("userId", ctx.userId))
          .orderBy("sortOrder", "asc"),
    ),
  },
});
