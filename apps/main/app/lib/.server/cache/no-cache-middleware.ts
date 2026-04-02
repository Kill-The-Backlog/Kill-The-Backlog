import type { MiddlewareFunction } from "react-router";

import { noStorePrivateCacheControl } from "./cache-control";

export const noCacheMiddleware: MiddlewareFunction<Response> = async (
  _args,
  next,
) => {
  const response = await next();

  if (response.headers.has("Cache-Control")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", noStorePrivateCacheControl);
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};
