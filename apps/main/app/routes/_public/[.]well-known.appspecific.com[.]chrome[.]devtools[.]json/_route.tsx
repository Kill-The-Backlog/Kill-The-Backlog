/**
 * Handles Chrome DevTools probing requests gracefully.
 *
 * Chrome DevTools sometimes sends requests to
 * /.well-known/appspecific.com.chrome.devtools.json
 * which can result in unnecessary error logs.
 *
 * This loader responds with HTTP 204 No Content to suppress such errors and
 * keep logs clean.
 *
 * https://www.reddit.com/r/node/comments/1kcr0wh/odd_request_coming_into_my_localhost_server_from/
 */
export const loader = () => new Response(null, { status: 204 });
