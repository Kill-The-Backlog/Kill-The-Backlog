import type { AnyWorker } from "./define-worker";

declare global {
  var __activeWorkers: AnyWorker[] | undefined;
  var __workersShutdownRegistered: boolean;
}

async function closeWorkers(workers: AnyWorker[]) {
  await Promise.all(
    workers.map((w) =>
      Promise.all([w.bullQueue.close(), w.bullWorker.close()]),
    ),
  );
}

function registerShutdown() {
  if (global.__workersShutdownRegistered) return;
  global.__workersShutdownRegistered = true;

  const shutdown = async () => {
    console.log("[workers] shutting down...");
    await closeWorkers(global.__activeWorkers ?? []);
    console.log("[workers] shutdown complete.");
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

export const runWorkers = async (workers: AnyWorker[]) => {
  registerShutdown();

  // Close stale workers from a previous HMR evaluation.
  const stale = (global.__activeWorkers ?? []).filter(
    (old) => !workers.includes(old),
  );

  if (stale.length > 0) {
    await closeWorkers(stale);
    for (const w of stale) {
      console.log("[workers] worker unloaded:", w.name);
    }
  }

  global.__activeWorkers = workers;

  for (const worker of workers) {
    if (!worker.bullWorker.isRunning()) {
      void worker.bullWorker.run();
      console.log("[workers] worker started:", worker.name);
    }
  }
};
