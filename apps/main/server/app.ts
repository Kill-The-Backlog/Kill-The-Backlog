import { createQueueDashExpressMiddleware } from "@queuedash/api";
import { createRequestHandler } from "@react-router/express";
import express from "express";

import { runWorkers } from "#lib/.server/workers/run-workers.js";
import { allWorkers } from "#workers/.server/index.js";

import { staffGuard } from "./staff-guard.js";

export const app = express();

void runWorkers(allWorkers);

const queueDash = createQueueDashExpressMiddleware({
  ctx: {
    queues: allWorkers.map((w) => ({
      displayName: w.name,
      queue: w.bullQueue,
      type: "bullmq" as const,
    })),
  },
});

app.use(
  "/admin/queuedash",
  staffGuard,
  queueDash,
  // No-op handler absorbs an erroneous next() call in queuedash's HTML-serving
  // path that would otherwise fall through to React Router.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  (_req, _res) => {},
);

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
  }),
);
