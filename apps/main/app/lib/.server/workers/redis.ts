import Redis from "ioredis";

import { serverEnv } from "#lib/.server/env/server.js";

export const makeRedisClient = () =>
  new Redis(serverEnv.REDIS_URL, {
    // Required by bullmq.
    maxRetriesPerRequest: null,
  });
