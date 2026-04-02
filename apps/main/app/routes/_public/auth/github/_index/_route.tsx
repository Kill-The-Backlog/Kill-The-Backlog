import { redirect } from "react-router";

import { generateAuthorizationUrl } from "#lib/.server/auth/github-oauth.js";
import { getSession } from "#lib/.server/auth/session.js";

import type { Route } from "./+types/_route";

export const loader = ({ context }: Route.LoaderArgs) => {
  const { state, url } = generateAuthorizationUrl();

  const session = getSession(context);
  session.set("oauthState", state);
  session.set("oauthMode", "signin");

  return redirect(url);
};
