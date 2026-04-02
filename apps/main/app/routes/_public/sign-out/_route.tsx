import { redirect } from "react-router";

import { getSession, sessionStorage } from "#lib/.server/auth/session.js";

import type { Route } from "./+types/_route";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const session = getSession(context);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};
