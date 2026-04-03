import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import type { DB } from "./generated/kysely/types.js";

import { envVars } from "./env.js";

export const makeDbClient = () => {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString: envVars.DB_URL }),
  });

  return new Kysely<DB>({
    dialect,
  });
};

export type { DB };
