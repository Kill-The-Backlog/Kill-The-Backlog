import { schema } from "@ktb/db/zero";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";

import { serverEnv } from "#lib/.server/env/server.js";

// @todo: Switch to `zeroKysely`?
export const dbProvider = zeroNodePg(schema, serverEnv.DB_URL);
