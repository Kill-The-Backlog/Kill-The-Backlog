import type { CardRunStatus } from "@ktb/db/types";

import {
  CircleNotchIcon,
  GitBranchIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@rocicorp/zero/react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { Badge } from "#components/ui/badge.js";
import { Button } from "#components/ui/button.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { useCardRunStream } from "./use-card-run-stream";

export function CardRunSection({ cardId }: { cardId: string }) {
  const { repoName, repoOwner } = useParams<Route.ComponentProps["params"]>();
  const [latestRun] = useQuery(queries.cardRuns.latestByCard({ cardId }));
  const outputRef = useRef<HTMLPreElement>(null);

  const [isStarting, setIsStarting] = useState(false);

  const isRunning =
    latestRun != null &&
    latestRun.status !== "completed" &&
    latestRun.status !== "failed";

  const { output } = useCardRunStream({ runId: latestRun?.id });

  if (isRunning && isStarting) {
    setIsStarting(false);
  }

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function startRun() {
    setIsStarting(true);
    try {
      const res = await fetch("/api/card-runs/start", {
        body: JSON.stringify({ cardId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) {
        setIsStarting(false);
        const body = (await res.json()) as { error?: string };
        toast.error(body.error ?? "Failed to start run");
      }
    } catch {
      setIsStarting(false);
      toast.error("Failed to start run");
    }
  }

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col border-t">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-muted-foreground text-2xs font-medium tracking-wider uppercase">
          AI Run
        </span>
        <div className="flex items-center gap-2">
          {latestRun && <RunStatusBadge status={latestRun.status} />}
          <Button
            disabled={isStarting || isRunning}
            onClick={() => void startRun()}
            size="xs"
            variant="outline"
          >
            {isStarting || isRunning ? (
              <CircleNotchIcon className="animate-spin" />
            ) : (
              <PlayIcon weight="fill" />
            )}
            {isStarting || latestRun?.status === "pending"
              ? "Starting"
              : isRunning
                ? "Running"
                : "Run"}
          </Button>
        </div>
      </div>

      {latestRun?.status === "completed" && latestRun.branchName && (
        <div className="border-border border-t px-4 py-2">
          <a
            className="text-primary inline-flex items-center gap-1.5 text-xs hover:underline"
            href={`https://github.com/${repoOwner}/${repoName}/compare/${latestRun.branchName}?expand=1`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitBranchIcon className="size-3.5" />
            {latestRun.branchName}
          </a>
        </div>
      )}

      {latestRun?.status === "failed" && latestRun.error && (
        <div className="border-border border-t px-4 py-2">
          <p className="text-destructive text-xs">{latestRun.error}</p>
        </div>
      )}

      {output.length > 0 && (
        <pre
          className="bg-muted/50 border-border min-h-0 flex-1 overflow-auto border-t p-3 font-mono text-[11px] leading-relaxed"
          ref={outputRef}
        >
          {output}
        </pre>
      )}
    </div>
  );
}

function RunStatusBadge({ status }: { status: CardRunStatus }) {
  switch (status) {
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    case "running":
      return <Badge variant="outline">Running</Badge>;
    default:
      return null;
  }
}
