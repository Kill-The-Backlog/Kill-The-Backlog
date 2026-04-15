import type { LinksFunction, MetaFunction } from "react-router";

import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  IconContext,
} from "@phosphor-icons/react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import invariant from "tiny-invariant";

import faviconDark from "#assets/favicon-dark.ico?url";
import faviconLight from "#assets/favicon-light.ico?url";
import { Button } from "#components/ui/button.js";
import { Toaster } from "#components/ui/sonner.js";
import { useNonce } from "#hooks/use-nonce.js";
import { getUser } from "#lib/.server/auth/auth-context.js";
import { sessionMiddleware } from "#lib/.server/auth/session.js";
import { noCacheMiddleware } from "#lib/.server/cache/no-cache-middleware.js";
import { clientEnv } from "#lib/.server/env/client.js";

import type { Route } from "./+types/root";

import globalCssHref from "./global.css?url";

export const meta: MetaFunction = () => [{ title: "Kill The Backlog" }];

export const middleware: Route.MiddlewareFunction[] = [
  sessionMiddleware,
  noCacheMiddleware,
];

export const links: LinksFunction = () => [
  { href: globalCssHref, rel: "stylesheet" },
  {
    href: faviconLight,
    media: "(prefers-color-scheme: light)",
    rel: "icon",
  },
  {
    href: faviconDark,
    media: "(prefers-color-scheme: dark)",
    rel: "icon",
  },
];

export const loader = async ({ context }: Route.LoaderArgs) => {
  const result = await getUser(context);

  if (!result) {
    return { env: clientEnv, user: null };
  }

  const { user } = result;

  return {
    env: clientEnv,
    user: {
      avatarUrl: user.avatarUrl,
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      isStaff: user.isStaff,
    },
  };
};

export default function App() {
  const nonce = useNonce();

  return (
    <html className="h-full" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          content="width=device-width, minimum-scale=1, maximum-scale=1, user-scalable=no"
          name="viewport"
        />
        <Meta />
        <Links nonce={nonce} />
      </head>
      <body className="h-full">
        <IconContext.Provider value={{ weight: "bold" }}>
          <Outlet />
          <Toaster />
        </IconContext.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const nonce = useNonce();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <html className="h-full" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          content="width=device-width, minimum-scale=1, maximum-scale=1, user-scalable=no"
          name="viewport"
        />
        <Meta />
        <Links nonce={nonce} />
      </head>
      <body className="flex h-full items-center justify-center">
        <IconContext.Provider value={{ weight: "bold" }}>
          <div className="flex max-w-sm flex-col items-center gap-6 text-center">
            <h1 className="text-2xl leading-tight font-bold tracking-tight">
              {isNotFound ? "Page not found." : "Something went wrong."}
            </h1>

            <p className="text-muted-foreground">
              {isNotFound
                ? "The page you're looking for doesn't exist or has been moved."
                : "An unexpected error occurred. Please try reloading the page."}
            </p>

            {isNotFound ? (
              <Button asChild size="lg">
                <Link to="/repos">
                  <ArrowLeftIcon />
                  Back to Kill The Backlog
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  window.location.reload();
                }}
                size="lg"
              >
                <ArrowsClockwiseIcon />
                Reload
              </Button>
            )}
          </div>
        </IconContext.Provider>

        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function useRootLoaderData() {
  const data = useRouteLoaderData<typeof loader>("root");
  invariant(data, "Root loader data not found.");
  return data;
}
