import type { MiddlewareFunction } from "react-router";

import { getSession } from "./session";

/**
 * Middleware that ensures oauthState and oauthMode are always cleared from
 * session in the response, regardless of success or failure.
 */
export const clearOAuthSessionMiddleware: MiddlewareFunction<Response> = async (
  { context },
  next,
) => {
  const response = await next();

  const session = getSession(context);
  const oauthKeys = ["oauthState", "oauthMode"] as const;

  for (const key of oauthKeys) {
    session.unset(key);
  }

  return response;
};
