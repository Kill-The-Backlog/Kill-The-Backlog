import { redirect } from "react-router";

import {
  authCookieStorage,
  getAuthCookie,
} from "#lib/.server/auth/cookie.js";

import type { Route } from "./+types/_route";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const cookie = getAuthCookie(context);

  return redirect("/", {
    headers: {
      "Set-Cookie": await authCookieStorage.destroySession(cookie),
    },
  });
};
