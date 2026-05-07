import type { QueryRowType } from "@rocicorp/zero";

import {
  BrowserIcon,
  TerminalWindowIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";

import type { PreviewLogEntry, PreviewStatus } from "#lib/session-preview.js";
import type { action as restartPreviewAction } from "#routes/_signed_in/api/sessions/$sessionId/preview/restart/_route.js";
import type { queries } from "#zero/queries.js";

import { Button } from "#components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog.js";
import { Spinner } from "#components/ui/spinner.js";
import {
  PREVIEW_FAILURE_STATUSES,
  PREVIEW_SCRIPT_PATH,
  PREVIEW_STATUS,
  previewBaseUrl,
  previewLogsSchema,
} from "#lib/session-preview.js";

type PreviewDisplayStatus = "pending" | PreviewStatus;
type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

const previewActionButtonClassName =
  "h-auto px-0 py-0 text-muted-foreground hover:text-foreground";

export function PreviewDetails({ session }: { session: SessionRow }) {
  const restartPreviewFetcher = useFetcher<typeof restartPreviewAction>();
  const previewLogs = parsePreviewLogs(session.previewLogs);
  const previewState = getPreviewState(session);
  const sandboxId = session.e2bSandboxId;
  const previewUrl =
    previewState.status === PREVIEW_STATUS.running && sandboxId !== null
      ? previewBaseUrl(sandboxId)
      : null;
  const isRestarting = restartPreviewFetcher.state !== "idle";
  const canShowRestart =
    sandboxId !== null &&
    previewState.status !== PREVIEW_STATUS.starting &&
    previewState.status !== PREVIEW_STATUS.restarting;
  const hasPreviewActions =
    previewUrl !== null || previewLogs.length > 0 || canShowRestart;

  const restartPreviewData = restartPreviewFetcher.data;
  useEffect(() => {
    if (
      restartPreviewData &&
      "error" in restartPreviewData &&
      restartPreviewData.error
    ) {
      toast.error(restartPreviewData.error);
    }
  }, [restartPreviewData]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <PreviewIcon status={previewState.status} />
        <div className="min-w-0 flex-1 truncate">{previewState.label}</div>
      </div>

      {previewState.description && (
        <p className="text-muted-foreground pl-6 text-pretty">
          {previewState.description}
        </p>
      )}

      {hasPreviewActions && (
        <div className="flex items-center gap-x-2 pl-6">
          {previewUrl && (
            <Button
              asChild
              className={previewActionButtonClassName}
              size="sm"
              variant="link"
            >
              <a href={previewUrl} rel="noopener noreferrer" target="_blank">
                Open preview
              </a>
            </Button>
          )}

          {previewLogs.length > 0 && <PreviewLogsDialog logs={previewLogs} />}

          {canShowRestart && (
            <Button
              className={previewActionButtonClassName}
              disabled={isRestarting}
              onClick={() => {
                void restartPreviewFetcher.submit(
                  {},
                  {
                    action: `/api/sessions/${session.id}/preview/restart`,
                    encType: "application/json",
                    method: "post",
                  },
                );
              }}
              size="sm"
              type="button"
              variant="link"
            >
              {isRestarting ? "Restarting" : "Restart"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function formatPreviewLog(log: PreviewLogEntry): string {
  const timestamp = new Date(log.at).toLocaleTimeString();
  return `[${timestamp}] ${log.stream}: ${log.text.trimEnd()}`;
}

function getPreviewState(session: SessionRow): {
  description: null | string;
  label: string;
  status: PreviewDisplayStatus;
} {
  switch (session.previewStatus) {
    case PREVIEW_STATUS.crashed:
      return {
        description:
          session.previewErrorMessage ?? "Preview process exited unexpectedly.",
        label: "Preview crashed",
        status: PREVIEW_STATUS.crashed,
      };
    case PREVIEW_STATUS.failed:
      return {
        description: session.previewErrorMessage ?? "Preview failed to start.",
        label: "Preview failed",
        status: PREVIEW_STATUS.failed,
      };
    case PREVIEW_STATUS.notConfigured:
      return {
        description:
          "Ask the agent to add .kill-the-backlog/preview.sh to enable previews.",
        label: "Preview not configured",
        status: PREVIEW_STATUS.notConfigured,
      };
    case PREVIEW_STATUS.restarting:
      return {
        description: "Stopping the old preview process and starting it again.",
        label: "Restarting preview",
        status: PREVIEW_STATUS.restarting,
      };
    case PREVIEW_STATUS.running:
      return {
        description: null,
        label: "Preview ready",
        status: PREVIEW_STATUS.running,
      };
    case PREVIEW_STATUS.starting:
      return {
        description: "The repo preview script is booting inside the sandbox.",
        label: "Starting preview",
        status: PREVIEW_STATUS.starting,
      };
    case PREVIEW_STATUS.unhealthy:
      return {
        description:
          session.previewErrorMessage ?? "Preview did not respond in time.",
        label: "Preview unhealthy",
        status: PREVIEW_STATUS.unhealthy,
      };
    default:
      return {
        description:
          session.e2bSandboxId === null
            ? "The sandbox is still bootstrapping."
            : "Preview startup is queued.",
        label: "Preview pending",
        status: "pending",
      };
  }
}

function parsePreviewLogs(value: unknown): PreviewLogEntry[] {
  return previewLogsSchema.safeParse(value).data ?? [];
}

function PreviewIcon({ status }: { status: PreviewDisplayStatus }) {
  if (
    status === PREVIEW_STATUS.starting ||
    status === PREVIEW_STATUS.restarting
  ) {
    return <Spinner className="size-4" />;
  }

  if (
    PREVIEW_FAILURE_STATUSES.some((failureStatus) => failureStatus === status)
  ) {
    return <WarningCircleIcon className="text-destructive size-4" />;
  }

  if (status === PREVIEW_STATUS.running) {
    return <BrowserIcon className="size-4" />;
  }

  return <TerminalWindowIcon className="size-4" />;
}

function PreviewLogsDialog({ logs }: { logs: PreviewLogEntry[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={previewActionButtonClassName}
          size="sm"
          type="button"
          variant="link"
        >
          View logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview logs</DialogTitle>
          <DialogDescription>
            Output from{" "}
            <code className="bg-muted text-muted-foreground rounded px-1 py-0.5 font-mono text-[0.85em]">
              {PREVIEW_SCRIPT_PATH}
            </code>
            .
          </DialogDescription>
        </DialogHeader>
        <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {logs.map(formatPreviewLog).join("\n")}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
