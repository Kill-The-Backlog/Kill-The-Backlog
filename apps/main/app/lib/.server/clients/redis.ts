import Redis from "ioredis";

import { serverEnv } from "#lib/.server/env/server.js";

export const redis = new Redis(serverEnv.REDIS_URL);
