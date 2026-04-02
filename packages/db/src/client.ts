import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import type { DB } from "./generated/types.js";

import { envVars } from "./env-vars.js";

export const makeDbClient = () => {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({
      connectionString: envVars.DB_URL,
      ssl: envVars.DB_SSL_NO_VERIFY ? { rejectUnauthorized: false } : false,
    }),
  });

  return new Kysely<DB>({
    dialect,
  });
};

export type { DB };
