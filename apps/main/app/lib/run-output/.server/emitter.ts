import type { RunOutputEvent } from "#lib/run-output/schemas.js";

export type StepEmitter = {
  emitError: (text: string) => void;
  emitText: (text: string) => void;
};

export function makeOutputEmitter(
  onEvent: (event: RunOutputEvent) => Promise<void>,
) {
  let pending = Promise.resolve();
  let stepCounter = 0;

  function push(event: RunOutputEvent) {
    pending = pending.then(() => onEvent(event));
  }

  function emitDone() {
    push({ type: "done" });
  }

  function emitError(text: string) {
    push({ text, type: "error" });
  }

  function emitText(text: string) {
    push({ text, type: "text" });
  }

  async function step(label: string, fn: (emit: StepEmitter) => Promise<void>) {
    const stepId = String(++stepCounter);
    push({ label, stepId, type: "step-start" });

    const emit: StepEmitter = {
      emitError: (text) => {
        push({ stepId, text, type: "error" });
      },
      emitText: (text) => {
        push({ stepId, text, type: "text" });
      },
    };

    try {
      await fn(emit);
      push({ status: "completed", stepId, type: "step-end" });
    } catch (error) {
      push({ status: "failed", stepId, type: "step-end" });
      throw error;
    }
  }

  return {
    emitDone,
    emitError,
    emitText,
    flush: () => pending,
    step,
  };
}
