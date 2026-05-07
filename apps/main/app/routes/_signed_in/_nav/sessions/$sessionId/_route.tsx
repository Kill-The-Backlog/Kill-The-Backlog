import type { QueryRowType } from "@rocicorp/zero";
import type { RefObject } from "react";

import {
  ArrowUpIcon,
  BrowserIcon,
  GitPullRequestIcon,
  StopIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@rocicorp/zero/react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useFetcher } from "react-router";
import { toast } from "sonner";

import type { action as abortPromptAction } from "#routes/_signed_in/api/sessions/$sessionId/abort/_route.js";
import type {
  action as sendPromptAction,
  SendSessionPromptBody,
} from "#routes/_signed_in/api/sessions/$sessionId/prompts/_route.js";

import { Button } from "#components/ui/button.js";
import { Spinner } from "#components/ui/spinner.js";
import { Textarea } from "#components/ui/textarea.js";
import { PREVIEW_STATUS, previewBaseUrl } from "#lib/session-preview.js";
import { cn } from "#lib/utils/cn.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { HeaderSlot } from "../../header-slot.js";
import { Details } from "./details.js";
import { Messages } from "./messages.js";

type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

export default function Route({ params }: Route.ComponentProps) {
  const [session, sessionResult] = useQuery(
    queries.sessions.one({ id: params.sessionId }),
  );

  if (!session && sessionResult.type === "complete") {
    return <Navigate replace to="/sessions" />;
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <HeaderSlot>
        <span className="truncate text-sm font-medium">
          {session.title ?? session.initialPrompt}
        </span>
      </HeaderSlot>
      {/* Page */}
      <div
        className="flex flex-1 justify-center px-4 py-8"
        /* Remount the whole page subtree on session change so every child's
          per-session state resets in one place: Messages' sticky-scroll
          anchor, Details' mount-time animation gates, and Composer's
          input value (which the browser would otherwise preserve across
          navigations). */
        key={session.id}
      >
        {/* Content */}
        <div className="flex w-full max-w-5xl gap-8">
          {/* Messages */}
          <div className="flex min-w-0 flex-1 flex-col">
            <Messages className="flex-1 pb-32" session={session} />
            <Composer
              className="sticky bottom-0 -mb-8 shrink-0 pb-4"
              session={session}
            />
          </div>
          {/* Details */}
          <Details
            className="sticky top-8 hidden w-64 shrink-0 self-start lg:flex"
            session={session}
          />
        </div>
      </div>
    </div>
  );
}

function Composer({
  className,
  session,
}: {
  className?: string;
  session: SessionRow;
}) {
  const isRunning =
    session.opencodeStatus === "busy" || session.opencodeStatus === "retry";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const {
    abortPrompt,
    isAbortDisabled,
    isSendDisabled,
    isSubmitting,
    submitPrompt,
  } = usePromptActions({
    isRunning,
    prompt,
    sessionId: session.id,
    setPrompt,
    textareaRef,
  });

  return (
    <form
      className={cn("bg-background w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        submitPrompt();
      }}
    >
      {/* Relative wrapper sits inside the form so the absolutely positioned
      submit button anchors to the textarea's edge. Putting `relative` on
      the form itself would shift the button outward by any padding the
      form receives from its parent (e.g. pb-4). */}
      <div className="relative">
        <ComposerPRBanner session={session} />
        <Textarea
          autoFocus
          className="min-h-24 resize-none pb-10"
          disabled={isSubmitting}
          name="prompt"
          onChange={(event) => {
            setPrompt(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submitPrompt();
            }
          }}
          placeholder="Ask or build anything"
          ref={textareaRef}
          value={prompt}
        />
        {isRunning ? (
          <Button
            className="absolute right-1.5 bottom-1.5"
            disabled={isAbortDisabled}
            onClick={abortPrompt}
            size="icon"
            type="button"
            variant="outline"
          >
            <StopIcon />
          </Button>
        ) : (
          <Button
            className="absolute right-1.5 bottom-1.5"
            disabled={isSendDisabled}
            size="icon"
            type="submit"
          >
            <ArrowUpIcon />
          </Button>
        )}
      </div>
    </form>
  );
}

function ComposerPRBanner({ session }: { session: SessionRow }) {
  // The parent route remounts `Composer` on session change via `key`, so this
  // captures whether the PR was already present when the user landed on this
  // session — allowing us to animate only when one *appears* mid-session.
  const hadPrOnMountRef = useRef(session.prNumber !== null);
  const previewUrl =
    session.previewStatus === PREVIEW_STATUS.running &&
    session.e2bSandboxId !== null
      ? previewBaseUrl(session.e2bSandboxId)
      : null;

  if (session.prNumber === null && previewUrl === null) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-full flex pb-2",
        !hadPrOnMountRef.current && "animate-in fade-in-0 duration-500",
      )}
    >
      {/* The row floats above the textarea so messages can slide
      behind it. The backdrop fades from transparent at the top of
      the row to the page background by the middle of the button,
      then stays solid through the `pb-2` gap so the strip between
      the button and the textarea reads as part of the same opaque
      surface (and seamlessly meets the form's bg below). */}
      <div
        aria-hidden
        className="to-background absolute inset-0 -z-10 bg-linear-to-b/srgb to-50%"
      />
      <div
        // The button's hover styles aren't opaque.
        className="flex gap-2"
      >
        {session.prNumber !== null && (
          <Button
            asChild
            className="bg-background pointer-events-auto rounded-full shadow-sm"
            size="lg"
            variant="outline"
          >
            <a
              href={`https://github.com/${session.repoFullName}/pull/${session.prNumber}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <GitPullRequestIcon data-icon="inline-start" />
              View PR
            </a>
          </Button>
        )}
        {previewUrl !== null && (
          <Button
            asChild
            className="bg-background pointer-events-auto rounded-full shadow-sm"
            size="lg"
            variant="outline"
          >
            <a href={previewUrl} rel="noopener noreferrer" target="_blank">
              <BrowserIcon data-icon="inline-start" />
              Open preview
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function usePromptActions({
  isRunning,
  prompt,
  sessionId,
  setPrompt,
  textareaRef,
}: {
  isRunning: boolean;
  prompt: string;
  sessionId: string;
  setPrompt: (prompt: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const sendPromptFetcher = useFetcher<typeof sendPromptAction>();
  const abortPromptFetcher = useFetcher<typeof abortPromptAction>();
  // Only reflect active server round-trips — not the post-action
  // revalidation ("loading"). Keeping the textarea enabled during
  // revalidation lets the below effect's `focus()` actually take effect
  // (focusing a disabled element is a silent no-op) and lets the user
  // start typing their next prompt as soon as the server responds.
  const isSubmitting =
    sendPromptFetcher.state === "submitting" ||
    abortPromptFetcher.state === "submitting";
  const isSendDisabled = isSubmitting || isRunning || !prompt.trim();

  const sendPromptData = sendPromptFetcher.data;
  useEffect(() => {
    if (sendPromptData && "error" in sendPromptData && sendPromptData.error) {
      toast.error(sendPromptData.error);
      textareaRef.current?.focus();
      return;
    }
    if (sendPromptData && "ok" in sendPromptData && sendPromptData.ok) {
      setPrompt("");
      textareaRef.current?.focus();
    }
  }, [sendPromptData, setPrompt, textareaRef]);

  const abortPromptData = abortPromptFetcher.data;
  useEffect(() => {
    if (
      abortPromptData &&
      "error" in abortPromptData &&
      abortPromptData.error
    ) {
      toast.error(abortPromptData.error);
      textareaRef.current?.focus();
      return;
    }
    if (abortPromptData && "ok" in abortPromptData && abortPromptData.ok) {
      textareaRef.current?.focus();
    }
  }, [abortPromptData, textareaRef]);

  const submitPrompt = () => {
    if (isSendDisabled) return;
    void sendPromptFetcher.submit({ prompt } satisfies SendSessionPromptBody, {
      action: `/api/sessions/${sessionId}/prompts`,
      encType: "application/json",
      method: "post",
    });
  };

  const abortPrompt = () => {
    if (abortPromptFetcher.state === "submitting") return;
    void abortPromptFetcher.submit(
      {},
      {
        action: `/api/sessions/${sessionId}/abort`,
        encType: "application/json",
        method: "post",
      },
    );
  };

  return {
    abortPrompt,
    isAbortDisabled: abortPromptFetcher.state === "submitting",
    isSendDisabled,
    isSubmitting,
    submitPrompt,
  };
}
