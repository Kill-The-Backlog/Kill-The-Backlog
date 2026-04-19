import type { MiddlewareFunction, RouterContextProvider } from "react-router";

import {
  createContext,
  createCookie,
  createCookieSessionStorage,
} from "react-router";

import { serverEnv } from "#lib/.server/env/server.js";

type AuthCookieData = {
  oauthMode?: "signin";
  oauthState?: string;
  userId?: number;
};

// Kept as `__session` so existing signed cookies stay valid — this string
// is a persisted identifier, not a naming choice.
const COOKIE_NAME = "__session";

const isSecure = serverEnv.MAIN_ORIGIN.startsWith("https://");

const cookieDomain = new URL(serverEnv.MAIN_ORIGIN).hostname;

const authCookie = createCookie(COOKIE_NAME, {
  domain: cookieDomain,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 14, // 14 days
  sameSite: "lax",
  secrets: [serverEnv.SESSION_SECRET],
  secure: isSecure,
});

export const authCookieStorage = createCookieSessionStorage<
  AuthCookieData,
  AuthCookieData
>({
  cookie: authCookie,
});

const authCookieContext =
  createContext<Awaited<ReturnType<typeof authCookieStorage.getSession>>>();

export const authCookieMiddleware: MiddlewareFunction<Response> = async (
  { context, request },
  next,
) => {
  const cookie = await authCookieStorage.getSession(
    request.headers.get("Cookie"),
  );
  context.set(authCookieContext, cookie);

  const response = await next();

  const alreadySet = response.headers
    .getSetCookie()
    .some((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!alreadySet) {
    response.headers.append(
      "Set-Cookie",
      await authCookieStorage.commitSession(cookie),
    );
  }

  return response;
};

export function getAuthCookie(context: Readonly<RouterContextProvider>) {
  return context.get(authCookieContext);
}
