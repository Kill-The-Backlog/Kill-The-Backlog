import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import { data } from "react-router";

import { getUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#zero/db.js";
import { mutators } from "#zero/mutators.js";

import type { Route } from "./+types/_route.js";

export async function action({ context, request }: Route.ActionArgs) {
  const result = await getUser(context);
  if (!result) {
    throw data(
      { error: "You must be signed in to access this" },
      { status: 401 },
    );
  }

  const { user } = result;

  return handleMutateRequest(
    db,
    (transact) =>
      transact((tx, name, args) => {
        const mutator = mustGetMutator(mutators, name);
        return mutator.fn({ args, ctx: { userId: user.id }, tx });
      }),
    request,
  );
}
