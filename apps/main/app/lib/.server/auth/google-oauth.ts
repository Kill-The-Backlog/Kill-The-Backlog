import { google } from "googleapis";
import crypto from "node:crypto";
import invariant from "tiny-invariant";

import { serverEnvVars } from "#lib/.server/server-env-vars.js";

const OAUTH_STATE_LENGTH = 32; // 32 bytes = 256 bits of entropy

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export type GoogleTokenPayload = {
  email: string;
  name: string;
  picture?: string;
  sub: string;
};

export type GoogleTokens = {
  access_token: string;
  expiry_date: number;
  id_token: string;
  refresh_token: string;
};

const googleOAuthClient = new google.auth.OAuth2(
  serverEnvVars.GOOGLE_OAUTH_CLIENT_ID,
  serverEnvVars.GOOGLE_OAUTH_CLIENT_SECRET,
  serverEnvVars.GOOGLE_OAUTH_REDIRECT_URI,
);

/**
 * Exchanges authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string,
): Promise<GoogleTokens> {
  const { tokens } = await googleOAuthClient.getToken(
    redirectUri ? { code, redirect_uri: redirectUri } : { code },
  );

  invariant(tokens.access_token, "Access token should be present.");
  invariant(tokens.refresh_token, "Refresh token should be present.");
  invariant(tokens.expiry_date, "Tokens expiry date should be present.");
  invariant(tokens.id_token, "ID token should be present with openid scope.");

  return {
    access_token: tokens.access_token,
    expiry_date: tokens.expiry_date,
    id_token: tokens.id_token,
    refresh_token: tokens.refresh_token,
  };
}

/**
 * Generates Google OAuth authorization URL with required parameters
 */
export function generateAuthorizationUrl(
  state: string,
  redirectUri?: string,
): string {
  return googleOAuthClient.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    // Google only sends a refresh token on the first auth flow unless you
    // explicitly show the consent screen each time.
    prompt: "consent",
    redirect_uri: redirectUri,
    scope: GOOGLE_OAUTH_SCOPES,
    state,
  });
}

/**
 * Generates a cryptographically secure random state for CSRF protection
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(OAUTH_STATE_LENGTH).toString("hex");
}

/**
 * Validates OAuth state from session against callback state parameter
 */
export function validateOAuthState(
  sessionState: string | undefined,
  callbackState: null | string,
): void {
  invariant(sessionState, "OAuth session state not found.");
  invariant(callbackState, "OAuth callback state not found.");
  invariant(sessionState === callbackState, "OAuth state mismatch.");
}

/**
 * Verifies ID token and extracts user payload
 */
export async function verifyAndExtractPayload(
  idToken: string,
): Promise<GoogleTokenPayload> {
  const ticket = await googleOAuthClient.verifyIdToken({ idToken });
  const payload = ticket.getPayload();

  invariant(payload, "Ticket payload should be present.");
  invariant(
    payload.email,
    "Email should be present with userinfo.email scope.",
  );
  invariant(
    payload.name,
    "Name should be present with userinfo.profile scope.",
  );

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub,
  };
}
