import { data, redirect } from "react-router";

import { getUser } from "#lib/.server/auth/auth-context.js";
import {
  authCookieStorage,
  getAuthCookie,
} from "#lib/.server/auth/cookie.js";

import type { Route } from "./+types/_route";

/*
 * Ensure user is signed _out_.
 */
export const loader = async ({ context }: Route.LoaderArgs) => {
  const result = await getUser(context);

  if (result) return redirect("/sessions");

  // Clear stale auth cookie if userId was set but user wasn't found.
  const cookie = getAuthCookie(context);

  if (cookie.data.userId) {
    return data(null, {
      headers: {
        "Set-Cookie": await authCookieStorage.destroySession(cookie),
      },
    });
  }

  return null;
};
