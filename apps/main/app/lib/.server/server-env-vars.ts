//
// These are accessible by loaders and actions.
//
import { requireEnvVars } from "@ktb/shared/env-vars";
import { z } from "zod";

const schema = z.object({
  DB_URL: z.url(),
  GOOGLE_OAUTH_CLIENT_ID: z.string(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string(),
  GOOGLE_OAUTH_REDIRECT_URI: z.url(),
  MAIN_ORIGIN: z.url(),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string(),
});

export const serverEnvVars = requireEnvVars(schema, process.env);
