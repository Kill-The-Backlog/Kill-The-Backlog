import { schema } from "@ktb/db/zero";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";

import { serverEnv } from "#lib/.server/env/server.js";

export const db = zeroNodePg(schema, serverEnv.DB_URL);
