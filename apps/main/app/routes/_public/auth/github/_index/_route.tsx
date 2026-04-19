import { redirect } from "react-router";

import { getAuthCookie } from "#lib/.server/auth/cookie.js";
import { generateAuthorizationUrl } from "#lib/.server/github/oauth.js";

import type { Route } from "./+types/_route";

export const loader = ({ context }: Route.LoaderArgs) => {
  const { state, url } = generateAuthorizationUrl();

  const cookie = getAuthCookie(context);
  cookie.set("oauthState", state);
  cookie.set("oauthMode", "signin");

  return redirect(url);
};
