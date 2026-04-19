import type { MiddlewareFunction } from "react-router";

import { getAuthCookie } from "./cookie";

/**
 * Middleware that ensures oauthState and oauthMode are always cleared from
 * the auth cookie in the response, regardless of success or failure.
 */
export const clearOAuthSessionMiddleware: MiddlewareFunction<Response> = async (
  { context },
  next,
) => {
  const response = await next();

  const cookie = getAuthCookie(context);
  const oauthKeys = ["oauthState", "oauthMode"] as const;

  for (const key of oauthKeys) {
    cookie.unset(key);
  }

  return response;
};
