import type { MiddlewareFunction, RouterContextProvider } from "react-router";

import {
  createContext,
  createCookie,
  createCookieSessionStorage,
} from "react-router";

import { serverEnvVars } from "#lib/.server/server-env-vars.js";

type SessionData = {
  oauthMode?: "signin";
  oauthState?: string;
  userId?: number;
};

const COOKIE_NAME = "__session";

const isSecure = serverEnvVars.MAIN_ORIGIN.startsWith("https://");

const sessionCookie = createCookie(COOKIE_NAME, {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 14, // 14 days
  sameSite: "lax",
  secrets: [serverEnvVars.SESSION_SECRET],
  secure: isSecure,
});

export const sessionStorage = createCookieSessionStorage<
  SessionData,
  SessionData
>({
  cookie: sessionCookie,
});

const sessionContext =
  createContext<Awaited<ReturnType<typeof sessionStorage.getSession>>>();

export const sessionMiddleware: MiddlewareFunction<Response> = async (
  { context, request },
  next,
) => {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  context.set(sessionContext, session);

  const response = await next();

  const alreadySet = response.headers
    .getSetCookie()
    .some((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!alreadySet) {
    response.headers.append(
      "Set-Cookie",
      await sessionStorage.commitSession(session),
    );
  }

  return response;
};

export function getSession(context: Readonly<RouterContextProvider>) {
  return context.get(sessionContext);
}
