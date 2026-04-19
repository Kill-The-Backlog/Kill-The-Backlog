import { data, redirect } from "react-router";

import { getAuthCookie } from "#lib/.server/auth/cookie.js";
import { clearOAuthSessionMiddleware } from "#lib/.server/auth/oauth-middleware.js";
import {
  exchangeCodeForAccessToken,
  fetchGitHubUserProfile,
  validateOAuthState,
} from "#lib/.server/github/oauth.js";
import { upsertUserWithGitHubAccount } from "#lib/.server/github/upsert-user.js";

import type { Route } from "./+types/_route";

export const middleware: Route.MiddlewareFunction[] = [
  clearOAuthSessionMiddleware,
];

export const loader = async ({ context, request }: Route.LoaderArgs) => {
  const cookie = getAuthCookie(context);

  const code = extractOAuthCode(request, cookie);
  const accessToken = await exchangeCodeForAccessToken(code);
  const profile = await fetchGitHubUserProfile(accessToken);
  const user = await upsertUserWithGitHubAccount(profile, accessToken);

  cookie.set("userId", user.id);
  return redirect("/");
};

function extractOAuthCode(
  request: Request,
  cookie: ReturnType<typeof getAuthCookie>,
): string {
  const oauthState = cookie.get("oauthState");
  const oauthMode = cookie.get("oauthMode");

  if (!oauthState) {
    throw data(
      { error: "Authentication session expired, please try signing in again" },
      { status: 400 },
    );
  }

  if (oauthMode !== "signin") {
    throw data(
      { error: "This callback is only for signing in" },
      { status: 400 },
    );
  }

  const queryParams = new URL(request.url).searchParams;

  // Check for OAuth errors from GitHub
  const error = queryParams.get("error");
  if (error) {
    throw data(
      {
        error:
          error === "access_denied"
            ? "You declined to grant access, please try again if you'd like to sign in"
            : "An error occurred during authentication, please try again",
      },
      { status: 400 },
    );
  }

  const code = queryParams.get("code");
  if (!code) {
    throw data(
      { error: "OAuth code not found, please try signing in again" },
      { status: 400 },
    );
  }

  try {
    validateOAuthState(oauthState, queryParams.get("state"));
  } catch {
    throw data(
      {
        error:
          "This authentication request may have been tampered with, please try signing in again",
      },
      { status: 400 },
    );
  }

  return code;
}
