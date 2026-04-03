import { requireEnv } from "@ktb/shared/env";
import { z } from "zod";

const schema = z.object({
  DB_URL: z.url(),
});

export const envVars = requireEnv(schema, process.env);
