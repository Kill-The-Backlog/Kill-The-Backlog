import type { AnyWorker } from "#lib/.server/workers/define-worker.js";

import { createSandboxWorker } from "./create-sandbox.js";

export const allWorkers: AnyWorker[] = [createSandboxWorker];
