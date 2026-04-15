import { data, redirect } from "react-router";

import { getUser } from "#lib/.server/auth/auth-context.js";
import { getSession, sessionStorage } from "#lib/.server/auth/session.js";

import type { Route } from "./+types/_route";

/*
 * Ensure user is signed _out_.
 */
export const loader = async ({ context }: Route.LoaderArgs) => {
  const result = await getUser(context);

  if (result) return redirect("/sessions");

  // Clear stale session if userId was set but user wasn't found.
  const session = getSession(context);

  if (session.data.userId) {
    return data(null, {
      headers: {
        "Set-Cookie": await sessionStorage.destroySession(session),
      },
    });
  }

  return null;
};
