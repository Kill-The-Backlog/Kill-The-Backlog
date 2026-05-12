import { createHmac } from "node:crypto";

import { serverEnv } from "#lib/.server/env/server.js";

export function getSessionEditorPassword(sessionId: string): string {
  return createHmac("sha256", serverEnv.SESSION_SECRET)
    .update(sessionId)
    .digest("base64url");
}
