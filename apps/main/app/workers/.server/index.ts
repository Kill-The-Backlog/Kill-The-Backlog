import type { AnyWorker } from "#lib/.server/workers/define-worker.js";

import { sandboxSupervisorWorker } from "./sandbox-supervisor/index.js";

export const allWorkers: AnyWorker[] = [sandboxSupervisorWorker];
