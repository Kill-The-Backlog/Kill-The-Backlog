import { buildPublicMaxAgeCacheControl } from "#lib/.server/cache/cache-control.js";

const robotsTxtContent = ["User-agent: *", "Disallow: /", ""].join("\n");

export const loader = () =>
  new Response(robotsTxtContent, {
    headers: {
      "Cache-Control": buildPublicMaxAgeCacheControl(60 * 60),
      "Content-Type": "text/plain",
    },
  });
