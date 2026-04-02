import type { EntryContext } from "react-router";

import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { randomBytes } from "node:crypto";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";

import { NonceProvider } from "#hooks/use-nonce.js";

export const streamTimeout = 30_000; // Bumped from 5s to 30s.

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
) {
  const nonce = randomBytes(16).toString("base64");
  responseHeaders.set("Content-Security-Policy", buildCspHeader(nonce));

  return isbot(request.headers.get("user-agent") ?? "")
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        reactRouterContext,
        nonce,
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        reactRouterContext,
        nonce,
      );
}

const isDev = process.env["NODE_ENV"] === "development";

function buildCspHeader(nonce: string) {
  // ws://localhost:* needed for react-router-devtools WebSocket
  const connectSrc = isDev
    ? "connect-src 'self' ws://localhost:*"
    : "connect-src 'self'";

  // blob: needed for vite-created web workers
  const workerSrc = isDev ? "worker-src 'self' blob:" : "worker-src 'self'";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    // Allow Google OAuth avatar images.
    "img-src 'self' https://lh3.googleusercontent.com",
    "font-src 'self'",
    connectSrc,
    workerSrc,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const handleBotRequest = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  nonce: string,
) =>
  new Promise((resolve, reject) => {
    let shellRendered = false;
    const { abort, pipe } = renderToPipeableStream(
      <NonceProvider value={nonce}>
        <ServerRouter
          context={reactRouterContext}
          nonce={nonce}
          url={request.url}
        />
      </NonceProvider>,
      {
        nonce,
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
        onShellError(error: unknown) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        },
      },
    );

    // Automatically timeout the React renderer after a few seconds, which
    // ensures React has enough time to flush down the rejected boundary
    // contents.
    setTimeout(abort, streamTimeout + 1000);
  });

const handleBrowserRequest = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  nonce: string,
) =>
  new Promise((resolve, reject) => {
    let shellRendered = false;
    const { abort, pipe } = renderToPipeableStream(
      <NonceProvider value={nonce}>
        <ServerRouter
          context={reactRouterContext}
          nonce={nonce}
          url={request.url}
        />
      </NonceProvider>,
      {
        nonce,
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
        onShellError(error: unknown) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        },
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
      },
    );

    // Automatically timeout the React renderer after a few seconds, which
    // ensures React has enough time to flush down the rejected boundary
    // contents.
    setTimeout(abort, streamTimeout + 1000);
  });
