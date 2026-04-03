import { redirect } from "react-router";

import { requireUser } from "#lib/.server/auth/auth-context.js";

import type { Route } from "./+types/_route";

export const loader = async ({ context }: Route.LoaderArgs) => {
  await requireUser(context);
  return redirect("/repos");
};
