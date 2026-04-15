import { Outlet } from "react-router";
import invariant from "tiny-invariant";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { useRootLoaderData } from "#root.js";
import { ZeroProvider } from "#zero/zero-provider.js";

import type { Route } from "./+types/_route";

/*
 * Ensure user is signed _in_.
 */
export const loader = async ({ context }: Route.LoaderArgs) => {
  await requireUser(context);
  return null;
};

export default function Route() {
  const { env, user } = useRootLoaderData();
  invariant(user, "User is required");

  return (
    <ZeroProvider cacheURL={env.ZERO_CACHE_URL} userId={user.id}>
      <Outlet />
    </ZeroProvider>
  );
}
