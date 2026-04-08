import { useEffect, useRef, useState } from "react";

import type { RunOutputEvent } from "#lib/run-output.js";

import { runOutputEventSchema } from "#lib/run-output.js";

export function useCardRunStream({ runId }: { runId: string | undefined }) {
  const [events, setEvents] = useState<RunOutputEvent[]>([]);
  const prevRunId = useRef(runId);

  if (runId !== prevRunId.current) {
    prevRunId.current = runId;
    setEvents([]);
  }

  useEffect(() => {
    if (!runId) return;

    const eventSource = new EventSource(`/api/card-runs/${runId}/stream`);

    eventSource.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = runOutputEventSchema.parse(JSON.parse(event.data));
        setEvents((prev) => [...prev, data]);
      } catch {
        eventSource.close();
        throw new Error(
          `Failed to parse card run stream event: ${event.data}`,
        );
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    eventSource.addEventListener("done", () => {
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [runId]);

  return { events };
}
