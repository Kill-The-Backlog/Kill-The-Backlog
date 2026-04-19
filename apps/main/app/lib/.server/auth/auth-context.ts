import type { RouterContextProvider } from "react-router";

import { createContext, redirect } from "react-router";

import { db } from "#lib/.server/clients/db.js";

import { authCookieStorage, getAuthCookie } from "./cookie";

type AuthResult = Awaited<ReturnType<typeof fetchUser>>;

const authResultContext = createContext<null | Promise<AuthResult>>(null);

/**
 * Resolves the authenticated user. Returns `null` if the user is not signed in.
 *
 * Results are cached per-request: concurrent loaders share a single DB
 * round-trip.
 */
export function getUser(context: Readonly<RouterContextProvider>) {
  const cached = context.get(authResultContext);
  if (cached) return cached;

  const promise = fetchUser(context);
  context.set(authResultContext, promise);
  return promise;
}

/**
 * Same as `getUser`, but redirects to sign-in if the user is not authenticated.
 */
export async function requireUser(context: Readonly<RouterContextProvider>) {
  const result = await getUser(context);

  if (!result) {
    const cookie = getAuthCookie(context);

    throw redirect("/sign-in", {
      headers: {
        "Set-Cookie": await authCookieStorage.destroySession(cookie),
      },
    });
  }

  return result;
}

async function fetchUser(context: Readonly<RouterContextProvider>) {
  const cookie = getAuthCookie(context);
  const { userId } = cookie.data;

  if (!userId) return null;

  const user = await db
    .selectFrom("User")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();

  if (!user) return null;

  return { cookie, user };
}
