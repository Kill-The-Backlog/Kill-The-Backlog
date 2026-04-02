import { redirect } from "react-router";

import {
  generateAuthorizationUrl,
  generateOAuthState,
} from "#lib/.server/auth/google-oauth.js";
import { getSession } from "#lib/.server/auth/session.js";

import type { Route } from "./+types/_route";

export const loader = ({ context }: Route.LoaderArgs) => {
  const state = generateOAuthState();
  const authorizationUrl = generateAuthorizationUrl(state);

  const session = getSession(context);
  session.set("oauthState", state);
  session.set("oauthMode", "signin");

  return redirect(authorizationUrl);
};
