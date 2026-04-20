import type { AnyWorker } from "#lib/.server/workers/define-worker.js";

import { sessionBootstrapperWorker } from "./session-bootstrapper/index.js";
import { sessionEventPumpWorker } from "./session-event-pump/index.js";
import { sessionTitlerWorker } from "./session-titler/index.js";

export const allWorkers: AnyWorker[] = [
  sessionBootstrapperWorker,
  sessionEventPumpWorker,
  sessionTitlerWorker,
];
