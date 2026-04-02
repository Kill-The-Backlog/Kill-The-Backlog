import { data, redirect } from "react-router";

import {
  exchangeCodeForAccessToken,
  fetchGitHubUserProfile,
  validateOAuthState,
} from "#lib/.server/auth/github-oauth.js";
import { upsertUserWithGitHubAccount } from "#lib/.server/auth/github-user-helpers.js";
import { clearOAuthSessionMiddleware } from "#lib/.server/auth/oauth-middleware.js";
import { getSession } from "#lib/.server/auth/session.js";

import type { Route } from "./+types/_route";

export const middleware: Route.MiddlewareFunction[] = [
  clearOAuthSessionMiddleware,
];

export const loader = async ({ context, request }: Route.LoaderArgs) => {
  const session = getSession(context);

  const code = extractOAuthCode(request, session);
  const accessToken = await exchangeCodeForAccessToken(code);
  const profile = await fetchGitHubUserProfile(accessToken);
  const user = await upsertUserWithGitHubAccount(profile, accessToken);

  session.set("userId", user.id);
  return redirect("/");
};

function extractOAuthCode(
  request: Request,
  session: ReturnType<typeof getSession>,
): string {
  const oauthState = session.get("oauthState");
  const oauthMode = session.get("oauthMode");

  if (!oauthState) {
    throw data(
      {
        error: "Authentication session expired",
        message: "Please try signing in again.",
      },
      { status: 400 },
    );
  }

  if (oauthMode !== "signin") {
    throw data(
      {
        error: "Invalid authentication mode",
        message: "This callback is only for signing in.",
      },
      { status: 400 },
    );
  }

  const queryParams = new URL(request.url).searchParams;

  // Check for OAuth errors from GitHub
  const error = queryParams.get("error");
  if (error) {
    throw data(
      {
        error: "Authentication failed",
        message:
          error === "access_denied"
            ? "You declined to grant access. Please try again if you'd like to sign in."
            : "An error occurred during authentication. Please try again.",
      },
      { status: 400 },
    );
  }

  const code = queryParams.get("code");
  if (!code) {
    throw data(
      {
        error: "Authentication failed",
        message: "OAuth code not found. Please try signing in again.",
      },
      { status: 400 },
    );
  }

  try {
    validateOAuthState(oauthState, queryParams.get("state"));
  } catch {
    throw data(
      {
        error: "Invalid authentication request",
        message:
          "This authentication request may have been tampered with. Please try signing in again.",
      },
      { status: 400 },
    );
  }

  return code;
}
