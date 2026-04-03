import { zql } from "@ktb/db/zero";
import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type {} from "./context.js";

export const queries = defineQueries({
  kanbanCards: {
    byRepo: defineQuery(
      z.object({ repoId: z.number() }),
      ({ args: { repoId }, ctx }) =>
        zql.KanbanCard.where("repoId", repoId)
          .whereExists("repo", (q) => q.where("userId", ctx.userId))
          .orderBy("sortOrder", "asc"),
    ),
  },
});
