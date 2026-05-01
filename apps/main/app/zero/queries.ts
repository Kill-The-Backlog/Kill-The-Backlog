import { zql } from "@ktb/db/zero";
import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type {} from "./context.js";

export const queries = defineQueries({
  sessions: {
    mine: defineQuery(({ ctx }) =>
      zql.Session.where("userId", ctx.userId).orderBy(
        "lastUserMessageAt",
        "desc",
      ),
    ),
    one: defineQuery(z.object({ id: z.string() }), ({ args: { id }, ctx }) =>
      zql.Session.where("id", id)
        .where("userId", ctx.userId)
        .related("messages", (m) =>
          m
            .related("parts", (p) => p.orderBy("createdAt", "asc"))
            .orderBy("opencodeCreatedAt", "asc"),
        )
        .one(),
    ),
  },
});
