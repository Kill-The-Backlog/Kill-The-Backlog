import { requireEnvVars, zBooleanString } from "@ktb/shared/env-vars";
import { z } from "zod";

const schema = z.object({
  DB_SSL_NO_VERIFY: zBooleanString,
  DB_URL: z.url(),
});

export const envVars = requireEnvVars(schema, process.env);
