import type { CardRunStatus } from "@ktb/db/types";

import {
  CheckCircleIcon,
  CircleNotchIcon,
  GitBranchIcon,
  PlayIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@rocicorp/zero/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import type { RunOutputEvent } from "#lib/run-output.js";

import { Alert, AlertDescription } from "#components/ui/alert.js";
import { Button } from "#components/ui/button.js";
import { cn } from "#lib/utils.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { useCardRunStream } from "./use-card-run-stream";

type Step = {
  label: string;
  messages: { text: string; type: "assistant-text" | "error" }[];
};

type StepStatus = "completed" | "failed" | "running";

export function CardRunSection({ cardId }: { cardId: string }) {
  const [latestRun] = useQuery(queries.cardRuns.latestByCard({ cardId }));
  const { repoName, repoOwner } = useParams<Route.ComponentProps["params"]>();
  const outputRef = useRef<HTMLDivElement>(null);

  const isRunning =
    latestRun != null &&
    latestRun.status !== "completed" &&
    latestRun.status !== "failed";

  const { isStarting, startRun } = useStartCardRun(cardId, isRunning);
  const isBusy = isRunning || isStarting;

  const buttonLabel =
    isStarting || latestRun?.status === "pending"
      ? "Starting"
      : isRunning
        ? "Running"
        : "Run";

  const { events } = useCardRunStream({ runId: latestRun?.id });
  const steps = useMemo(() => groupEventsIntoSteps(events), [events]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col border-t">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-muted-foreground text-2xs font-medium tracking-wider whitespace-nowrap uppercase">
          AI Run
        </span>
        <div className="flex items-center gap-2">
          {latestRun && <RunStatusBadge status={latestRun.status} />}
          {latestRun?.status === "completed" && latestRun.branchName && (
            <Button asChild size="xs" variant="outline">
              <a
                href={`https://github.com/${repoOwner}/${repoName}/compare/${latestRun.branchName}?expand=1`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GitBranchIcon weight="bold" />
                {latestRun.branchName}
              </a>
            </Button>
          )}
          <Button
            disabled={isBusy}
            onClick={() => void startRun()}
            size="xs"
            variant="outline"
          >
            {isBusy ? (
              <CircleNotchIcon className="animate-spin" />
            ) : (
              <PlayIcon weight="fill" />
            )}
            {buttonLabel}
          </Button>
        </div>
      </div>

      {latestRun?.status === "failed" && latestRun.error && (
        <RunErrorBanner error={latestRun.error} />
      )}

      {steps.length > 0 && (
        <div
          className="border-border min-h-0 flex-1 overflow-auto border-t bg-black/2 dark:bg-white/2"
          ref={outputRef}
        >
          <div className="space-y-0.5 px-4 py-3">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const stepStatus: StepStatus = !isLast
                ? "completed"
                : latestRun?.status === "failed"
                  ? "failed"
                  : isRunning
                    ? "running"
                    : "completed";

              return <StepItem key={i} status={stepStatus} step={step} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function groupEventsIntoSteps(events: RunOutputEvent[]): Step[] {
  const steps: Step[] = [];
  for (const event of events) {
    if (event.type === "done") continue;
    if (event.type === "status") {
      steps.push({ label: event.text, messages: [] });
    } else if (steps.length > 0) {
      steps.at(-1)!.messages.push(event);
    }
  }
  return steps;
}

function RunErrorBanner({ error }: { error: string }) {
  return (
    <div className="border-border border-t px-4 py-3">
      <Alert variant="destructive">
        <WarningCircleIcon weight="fill" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );
}

function StepItem({ status, step }: { status: StepStatus; step: Step }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-px shrink-0">
        {status === "completed" && (
          <CheckCircleIcon className="text-success size-3.5" weight="fill" />
        )}
        {status === "running" && (
          <CircleNotchIcon className="text-primary size-3.5 animate-spin" />
        )}
        {status === "failed" && (
          <WarningCircleIcon
            className="text-destructive size-3.5"
            weight="fill"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs",
            status === "completed" && "text-muted-foreground",
            status === "running" && "text-foreground",
            status === "failed" && "text-destructive",
          )}
        >
          {step.label}
        </p>
        {step.messages.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {step.messages.map((msg, i) => (
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  msg.type === "assistant-text" && "text-foreground",
                  msg.type === "error" && "text-destructive",
                )}
                key={i}
              >
                {msg.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useStartCardRun(cardId: string, isRunning: boolean) {
  const [isStarting, setIsStarting] = useState(false);

  if (isRunning && isStarting) {
    setIsStarting(false);
  }

  async function startRun() {
    setIsStarting(true);
    try {
      const res = await fetch("/api/card-runs/start", {
        body: JSON.stringify({ cardId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to start run");
      }
    } catch (err) {
      setIsStarting(false);
      toast.error(err instanceof Error ? err.message : "Failed to start run");
    }
  }

  return { isStarting, startRun };
}

const STATUS_DOT_CLASSES: Record<CardRunStatus, string> = {
  completed: "bg-success",
  failed: "bg-destructive",
  pending: "bg-muted-foreground animate-pulse",
  running: "bg-primary animate-pulse",
};

const STATUS_LABELS: Record<CardRunStatus, string> = {
  completed: "Completed",
  failed: "Failed",
  pending: "Pending",
  running: "Running",
};

function RunStatusBadge({ status }: { status: CardRunStatus }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          STATUS_DOT_CLASSES[status],
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
