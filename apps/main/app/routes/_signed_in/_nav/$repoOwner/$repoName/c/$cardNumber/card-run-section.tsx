import type { CardRunStatus } from "@ktb/db/types";
import type { Row } from "@rocicorp/zero";

import {
  CheckCircleIcon,
  CircleNotchIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  PlayIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@rocicorp/zero/react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import type { RunOutputEvent } from "#lib/run-output/schemas.js";
import type { Step } from "#lib/run-output/steps.js";

import { Button } from "#components/ui/button.js";
import { groupEventsIntoSteps } from "#lib/run-output/steps.js";
import { cn } from "#lib/utils.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { useCardRunStream } from "./use-card-run-stream";

type StepStatus = "completed" | "failed" | "running";

export function CardRunSection({ cardId }: { cardId: string }) {
  const [latestRun] = useQuery(queries.cardRuns.latestByCard({ cardId }));
  const { events } = useCardRunStream({ runId: latestRun?.id });

  const isRunning =
    latestRun != null &&
    latestRun.status !== "completed" &&
    latestRun.status !== "failed";

  const { isStarting, startRun } = useStartCardRun(cardId, isRunning);
  const isBusy = isRunning || isStarting;

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col border-t">
      <CardRunHeader
        isBusy={isBusy}
        isStarting={isStarting}
        latestRun={latestRun}
        onStartRun={() => void startRun()}
      />

      <CardRunBody events={events} latestRun={latestRun} />
    </div>
  );
}

function BranchLinkButton({ latestRun }: { latestRun: Row["CardRun"] }) {
  const { repoName, repoOwner } = useParams<Route.ComponentProps["params"]>();

  if (
    latestRun.status !== "completed" ||
    latestRun.branchName == null ||
    repoOwner == null ||
    repoName == null
  ) {
    return null;
  }

  const compareUrl = githubCompareUrl({
    branch: latestRun.branchName,
    repoName,
    repoOwner,
  });

  return (
    <Button asChild size="xs" variant="outline">
      <a href={compareUrl} rel="noopener noreferrer" target="_blank">
        <GitBranchIcon weight="bold" />
        {latestRun.branchName}
      </a>
    </Button>
  );
}

function PRLinkButton({ latestRun }: { latestRun: Row["CardRun"] }) {
  if (
    latestRun.status !== "completed" ||
    latestRun.prUrl == null
  ) {
    return null;
  }

  return (
    <Button asChild size="xs" variant="outline">
      <a href={latestRun.prUrl} rel="noopener noreferrer" target="_blank">
        <GitPullRequestIcon weight="bold" />
        PR
      </a>
    </Button>
  );
}

function CardRunBody({
  events,
  latestRun,
}: {
  events: RunOutputEvent[];
  latestRun: Row["CardRun"] | undefined;
}) {
  const outputRef = useRef<HTMLDivElement>(null);
  const steps = groupEventsIntoSteps(events);

  const openStepFallback = stepFallbackStatus(latestRun?.status);

  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [events]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col border-t">
      <div
        className="min-h-0 flex-1 overflow-auto bg-black/2 dark:bg-white/2"
        ref={outputRef}
      >
        <div className="space-y-0.5 px-4 py-3">
          {steps.map((step, i) => (
            <StepItem
              key={i}
              status={step.status ?? openStepFallback}
              step={step}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardRunHeader({
  isBusy,
  isStarting,
  latestRun,
  onStartRun,
}: {
  isBusy: boolean;
  isStarting: boolean;
  latestRun: Row["CardRun"] | undefined;
  onStartRun: () => void;
}) {
  const buttonLabel =
    isStarting || latestRun?.status === "pending"
      ? "Starting"
      : latestRun?.status === "running"
        ? "Running"
        : "Run";

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <span className="text-muted-foreground text-2xs font-medium tracking-wider whitespace-nowrap uppercase">
        AI Run
      </span>
      <div className="flex items-center gap-2">
        {latestRun && <RunStatusBadge status={latestRun.status} />}
        {latestRun && <BranchLinkButton latestRun={latestRun} />}
        {latestRun && <PRLinkButton latestRun={latestRun} />}
        <Button
          disabled={isBusy}
          onClick={onStartRun}
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
  );
}

function githubCompareUrl({
  branch,
  repoName,
  repoOwner,
}: {
  branch: string;
  repoName: string;
  repoOwner: string;
}): string {
  return `https://github.com/${repoOwner}/${repoName}/compare/${branch}?expand=1`;
}

function stepFallbackStatus(runStatus: CardRunStatus | undefined): StepStatus {
  if (runStatus === "completed") return "completed";
  if (runStatus === "failed") return "failed";
  return "running";
}

function StepItem({ status, step }: { status: StepStatus; step: Step }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="shrink-0">
        <StepStatusGlyph status={status} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-xs",
            status === "completed" && "text-muted-foreground",
            status === "running" && "text-foreground",
            status === "failed" && "text-destructive",
          )}
        >
          {step.label}
        </div>
        {step.messages.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {step.messages.map((msg, i) => (
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  msg.type === "text" && "text-foreground",
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

function StepStatusGlyph({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <CheckCircleIcon className="text-success size-3.5" weight="fill" />
      );
    case "failed":
      return (
        <WarningCircleIcon
          className="text-destructive size-3.5"
          weight="fill"
        />
      );
    case "running":
      return <CircleNotchIcon className="text-primary size-3.5 animate-spin" />;
  }
}

function useStartCardRun(cardId: string, isRunning: boolean) {
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (isRunning && isStarting) {
      setIsStarting(false);
    }
  }, [isRunning, isStarting]);

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

const RUN_STATUS_CONFIG: Record<CardRunStatus, { dot: string; label: string }> =
  {
    completed: { dot: "bg-success", label: "Completed" },
    failed: { dot: "bg-destructive", label: "Failed" },
    pending: { dot: "bg-muted-foreground animate-pulse", label: "Pending" },
    running: { dot: "bg-primary animate-pulse", label: "Running" },
  };

function RunStatusBadge({ status }: { status: CardRunStatus }) {
  const config = RUN_STATUS_CONFIG[status];

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
      <span className={cn("inline-block size-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

