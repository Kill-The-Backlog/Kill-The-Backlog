import { zql } from "@ktb/db/zero";
import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import type {} from "./context.js";
export const queries = defineQueries({
  stub: defineQuery(z.object(), ({ ctx }) => zql.User.where("id", ctx.userId)),
});
