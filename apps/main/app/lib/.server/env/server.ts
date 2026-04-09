import { requireEnv } from "@ktb/shared/env";
import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  DB_URL: z.url(),
  E2B_API_KEY: z.string().optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string(),
  GITHUB_OAUTH_REDIRECT_URI: z.url(),
  MAIN_ORIGIN: z.url(),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string(),
});

export const serverEnv = requireEnv(schema, process.env);
