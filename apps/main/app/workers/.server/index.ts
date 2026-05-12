import type { AnyWorker } from "#lib/.server/workers/define-worker.js";

import { sessionBootstrapperWorker } from "./session-bootstrapper/index.js";
import { sessionEditorStarterWorker } from "./session-editor-starter/index.js";
import { sessionEventPumpWorker } from "./session-event-pump/index.js";
import { sessionPreviewStarterWorker } from "./session-preview-starter/index.js";
import { sessionTitlerWorker } from "./session-titler/index.js";

export const allWorkers: AnyWorker[] = [
  sessionBootstrapperWorker,
  sessionEditorStarterWorker,
  sessionEventPumpWorker,
  sessionPreviewStarterWorker,
  sessionTitlerWorker,
];
