import { requireUser } from "#lib/.server/auth/auth-context.js";

import type { Route } from "./+types/_route";

/*
 * Ensure user is signed _in_.
 */
export const loader = async ({ context }: Route.LoaderArgs) => {
  await requireUser(context);
  return null;
};
