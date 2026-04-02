import { oauthAuthorizationUrl } from "@octokit/oauth-authorization-url";
import { exchangeWebFlowCode } from "@octokit/oauth-methods";
import { Octokit } from "@octokit/rest";
import invariant from "tiny-invariant";

import { serverEnvVars } from "#lib/.server/server-env-vars.js";

const SCOPES = ["read:user", "user:email", "repo"];

export type GitHubUserProfile = {
  avatarUrl: null | string;
  email: string;
  githubId: number;
  login: string;
  name: null | string;
};

export async function exchangeCodeForAccessToken(
  code: string,
): Promise<string> {
  const { authentication } = await exchangeWebFlowCode({
    clientId: serverEnvVars.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: serverEnvVars.GITHUB_OAUTH_CLIENT_SECRET,
    clientType: "oauth-app",
    code,
    redirectUrl: serverEnvVars.GITHUB_OAUTH_REDIRECT_URI,
  });

  return authentication.token;
}

export async function fetchGitHubUserProfile(
  accessToken: string,
): Promise<GitHubUserProfile> {
  const octokit = new Octokit({ auth: accessToken });

  // GET /user's `email` field is null when the user keeps their email private.
  // GET /user/emails (requires `user:email` scope) is the only reliable way to
  // get the verified primary email regardless of visibility settings.
  const [{ data: user }, { data: emails }] = await Promise.all([
    octokit.rest.users.getAuthenticated(),
    octokit.rest.users.listEmailsForAuthenticatedUser(),
  ]);

  const primaryEmail = emails.find((e) => e.primary && e.verified);
  invariant(primaryEmail, "No verified primary email found on GitHub account.");

  return {
    avatarUrl: user.avatar_url,
    email: primaryEmail.email,
    githubId: user.id,
    login: user.login,
    name: user.name,
  };
}

export function generateAuthorizationUrl(): { state: string; url: string } {
  const { state, url } = oauthAuthorizationUrl({
    clientId: serverEnvVars.GITHUB_OAUTH_CLIENT_ID,
    redirectUrl: serverEnvVars.GITHUB_OAUTH_REDIRECT_URI,
    scopes: SCOPES,
  });

  return { state, url };
}

export function validateOAuthState(
  sessionState: string | undefined,
  callbackState: null | string,
): void {
  invariant(sessionState, "OAuth session state not found.");
  invariant(callbackState, "OAuth callback state not found.");
  invariant(sessionState === callbackState, "OAuth state mismatch.");
}
