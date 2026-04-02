import Redis from "ioredis";

import { serverEnvVars } from "#lib/.server/server-env-vars.js";

export const makeRedisClient = () =>
  new Redis(serverEnvVars.REDIS_URL, {
    // Required by bullmq.
    maxRetriesPerRequest: null,
  });
