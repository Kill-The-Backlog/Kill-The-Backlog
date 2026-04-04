import type { AnyWorker } from "#lib/.server/workers/define-worker.js";

import { cardRunWorker } from "./card-run.js";

export const allWorkers: AnyWorker[] = [cardRunWorker];
