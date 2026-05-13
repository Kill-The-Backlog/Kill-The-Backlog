import { requireEnv, zOptionalNonEmptyString } from "@ktb/shared/env";
import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().trim().min(1),
  DB_URL: z.url(),
  E2B_API_KEY: z.string().trim().min(1),
  E2B_TEMPLATE_NAME: z.string().trim().min(1),
  GITHUB_OAUTH_CLIENT_ID: z.string().trim().min(1),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().trim().min(1),
  GITHUB_OAUTH_REDIRECT_URI: z.url(),
  MAIN_ORIGIN: z.url(),
  OPENAI_API_KEY: zOptionalNonEmptyString,
  PROVIDER_API_KEY_ENCRYPTION_SECRET: z.string().trim().min(1),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string().trim().min(1),
});

export const serverEnv = requireEnv(schema, process.env);
