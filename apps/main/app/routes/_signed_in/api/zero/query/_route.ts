import { schema } from "@ktb/db/zero";
import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { data } from "react-router";

import { getUser } from "#lib/.server/auth/auth-context.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route.js";

export async function action({ context, request }: Route.ActionArgs) {
  const result = await getUser(context);
  if (!result) {
    throw data({ error: "You must be signed in to access this" }, { status: 401 });
  }

  const { user } = result;

  return handleQueryRequest(
    (name, args) => {
      const query = mustGetQuery(queries, name);
      return query.fn({ args, ctx: { userId: user.id } });
    },
    schema,
    request,
  );
}
