import { zql } from "@ktb/db/zero";
import { defineQueries, defineQuery } from "@rocicorp/zero";

import type {} from "./context.js";

export const queries = defineQueries({
  sessions: {
    mine: defineQuery(({ ctx }) =>
      zql.Session.where("userId", ctx.userId).orderBy("createdAt", "desc"),
    ),
  },
});
