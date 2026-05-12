import type { QueryRowType } from "@rocicorp/zero";

import { CodeIcon, WarningCircleIcon } from "@phosphor-icons/react";

import type { EditorStatus } from "#lib/session-editor.js";
import type { queries } from "#zero/queries.js";

import { Button } from "#components/ui/button.js";
import { Spinner } from "#components/ui/spinner.js";
import {
  EDITOR_FAILURE_STATUSES,
  EDITOR_STATUS,
} from "#lib/session-editor.js";

type EditorDisplayStatus = "pending" | EditorStatus;
type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

const editorActionButtonClassName =
  "h-auto px-0 py-0 text-muted-foreground hover:text-foreground";

export function EditorDetails({ session }: { session: SessionRow }) {
  const editorState = getEditorState(session);
  const canOpenEditor =
    editorState.status === EDITOR_STATUS.running &&
    session.e2bSandboxId !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <EditorIcon status={editorState.status} />
        <div className="min-w-0 flex-1 truncate">{editorState.label}</div>
      </div>

      {editorState.description && (
        <p className="text-muted-foreground pl-6 text-pretty">
          {editorState.description}
        </p>
      )}

      {canOpenEditor && (
        <div className="flex items-center gap-x-2 pl-6">
          <Button
            asChild
            className={editorActionButtonClassName}
            size="sm"
            variant="link"
          >
            <a
              href={`/api/sessions/${session.id}/editor`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open VS Code
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

function EditorIcon({ status }: { status: EditorDisplayStatus }) {
  if (status === EDITOR_STATUS.starting) {
    return <Spinner className="size-4" />;
  }

  if (
    EDITOR_FAILURE_STATUSES.some((failureStatus) => failureStatus === status)
  ) {
    return <WarningCircleIcon className="text-destructive size-4" />;
  }

  return <CodeIcon className="size-4" />;
}

function getEditorState(session: SessionRow): {
  description: null | string;
  label: string;
  status: EditorDisplayStatus;
} {
  switch (session.editorStatus) {
    case EDITOR_STATUS.crashed:
      return {
        description:
          session.editorErrorMessage ?? "VS Code exited unexpectedly.",
        label: "VS Code crashed",
        status: EDITOR_STATUS.crashed,
      };

    case EDITOR_STATUS.failed:
      return {
        description: session.editorErrorMessage ?? "VS Code failed to start.",
        label: "VS Code failed",
        status: EDITOR_STATUS.failed,
      };

    case EDITOR_STATUS.running:
      return {
        description: null,
        label: "VS Code ready",
        status: EDITOR_STATUS.running,
      };

    case EDITOR_STATUS.starting:
      return {
        description: "The editor is starting inside the sandbox.",
        label: "Starting VS Code",
        status: EDITOR_STATUS.starting,
      };

    case EDITOR_STATUS.unhealthy:
      return {
        description:
          session.editorErrorMessage ?? "VS Code did not respond in time.",
        label: "VS Code unhealthy",
        status: EDITOR_STATUS.unhealthy,
      };

    default:
      return {
        description:
          session.e2bSandboxId === null
            ? "The sandbox is still bootstrapping."
            : "Editor startup is queued.",
        label: "VS Code pending",
        status: "pending",
      };
  }
}
