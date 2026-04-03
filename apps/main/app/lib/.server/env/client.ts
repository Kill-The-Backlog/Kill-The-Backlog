//
// !IMPORTANT!
//
// The variables defined below are exposed to client-side code. Only include
// values that are safe for public access; never add secrets or sensitive data
// here.
//

import { requireEnv } from "@ktb/shared/env";
import { z } from "zod";

const schema = z.object({
  ZERO_CACHE_URL: z.url(),
});

export const clientEnv = requireEnv(schema, process.env);
