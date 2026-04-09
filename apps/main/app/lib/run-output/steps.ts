import type { RunOutputEvent } from "#lib/run-output/schemas.js";

export type Step = {
  label: string;
  messages: OutputMessage[];
  status: "completed" | "failed" | null;
};

type OutputMessage = Extract<RunOutputEvent, { type: "error" | "text" }>;

export function groupEventsIntoSteps(events: RunOutputEvent[]): Step[] {
  const steps: Step[] = [];
  const stepsById = new Map<string, Step>();

  for (const event of events) {
    if (event.type === "done") continue;

    if (event.type === "step-start") {
      const step: Step = { label: event.label, messages: [], status: null };
      steps.push(step);
      stepsById.set(event.stepId, step);
      continue;
    }

    if (event.type === "step-end") {
      const step = stepsById.get(event.stepId);
      if (step) step.status = event.status;
      continue;
    }

    const targetStep =
      event.stepId != null ? stepsById.get(event.stepId) : undefined;
    if (targetStep != null) {
      targetStep.messages.push(event);
    } else {
      const label = event.type === "error" ? "Run failed" : "Output";
      const status = event.type === "error" ? "failed" : null;
      steps.push({ label, messages: [event], status });
    }
  }

  return steps;
}
