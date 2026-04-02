import Redis from "ioredis";

import { serverEnvVars } from "#lib/.server/server-env-vars.js";

export const redis = new Redis(serverEnvVars.REDIS_URL);
