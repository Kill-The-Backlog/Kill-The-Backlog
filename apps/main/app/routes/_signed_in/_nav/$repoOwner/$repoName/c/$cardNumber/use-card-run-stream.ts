import { useEffect, useRef, useState } from "react";

export function useCardRunStream({ runId }: { runId: string | undefined }) {
  const [output, setOutput] = useState("");
  const prevRunId = useRef(runId);

  if (runId !== prevRunId.current) {
    prevRunId.current = runId;
    setOutput("");
  }

  useEffect(() => {
    if (!runId) return;

    const eventSource = new EventSource(`/api/card-runs/${runId}/stream`);

    eventSource.onmessage = (event: MessageEvent<string>) => {
      const text = JSON.parse(event.data) as string;
      setOutput((prev) => prev + text);
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

  return { output };
}
