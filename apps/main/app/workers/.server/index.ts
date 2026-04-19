import type { AnyWorker } from "#lib/.server/workers/define-worker.js";

import { sessionBootstrapperWorker } from "./session-bootstrapper/index.js";
import { sessionEventPumpWorker } from "./session-event-pump/index.js";

export const allWorkers: AnyWorker[] = [
  sessionBootstrapperWorker,
  sessionEventPumpWorker,
];
