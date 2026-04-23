import { ArrowUpIcon } from "@phosphor-icons/react";
import { useQuery } from "@rocicorp/zero/react";
import { useEffect, useRef, useState } from "react";
import { data, Navigate, useFetcher } from "react-router";
import { toast } from "sonner";
import invariant from "tiny-invariant";
import { z } from "zod";

import { Button } from "#components/ui/button.js";
import { Spinner } from "#components/ui/spinner.js";
import { Textarea } from "#components/ui/textarea.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { dispatchPrompt } from "#lib/.server/sessions/dispatch-prompt.js";
import { queryPatchSession } from "#lib/.server/sessions/patch-session.js";
import { cn } from "#lib/utils/cn.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { HeaderSlot } from "../../header-slot.js";
import { Details } from "./details.js";
import { Messages } from "./messages.js";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export const action = async ({
  context,
  params,
  request,
}: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const sessionId = params.sessionId;

  const session = await db
    .selectFrom("Session")
    .select(["id", "e2bSandboxId", "opencodeSessionId"])
    .where("id", "=", sessionId)
    .where("userId", "=", user.id)
    .executeTakeFirst();
  if (!session) {
    throw data({ error: "Session not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const result = requestSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return data(
      { error: result.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  invariant(
    session.e2bSandboxId && session.opencodeSessionId,
    `Session ${sessionId} has not finished bootstrapping`,
  );

  // A follow-up submission is the user's "retry" signal, so wipe any prior
  // `errorMessage` before we attempt again — otherwise a stale error would
  // keep showing in the UI and, more importantly, future runs treat it as
  // the session's live error state. If this attempt fails, the pump /
  // `session.error` handlers will record a fresh message.
  await queryPatchSession(sessionId, { errorMessage: null });

  await dispatchPrompt({
    e2bSandboxId: session.e2bSandboxId,
    opencodeSessionId: session.opencodeSessionId,
    sessionId,
    text: result.data.prompt,
  });

  return data({ ok: true });
};

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
            <Composer className="sticky bottom-0 -mb-8 shrink-0 pb-4" />
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

function Composer({ className }: { className?: string }) {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  // Only reflect the active server round-trip — not the post-action
  // revalidation ("loading"). Keeping the textarea enabled during
  // revalidation lets the below effect's `focus()` actually take effect
  // (focusing a disabled element is a silent no-op) and lets the user
  // start typing their next prompt as soon as the server responds.
  const isSubmitting = fetcher.state === "submitting";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const isSubmitDisabled = isSubmitting || !prompt.trim();

  const actionData = fetcher.data;
  useEffect(() => {
    if (actionData && "error" in actionData && actionData.error) {
      toast.error(actionData.error);
      textareaRef.current?.focus();
      return;
    }
    if (actionData && "ok" in actionData && actionData.ok) {
      setPrompt("");
      textareaRef.current?.focus();
    }
  }, [actionData]);

  return (
    <fetcher.Form
      className={cn("bg-background w-full", className)}
      method="post"
    >
      {/* Relative wrapper sits inside the form so the absolutely positioned
      submit button anchors to the textarea's edge. Putting `relative` on
      the form itself would shift the button outward by any padding the
      form receives from its parent (e.g. pb-4). */}
      <div className="relative">
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
              if (isSubmitDisabled) return;
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask or build anything"
          ref={textareaRef}
          value={prompt}
        />
        <Button
          className="absolute right-1.5 bottom-1.5"
          disabled={isSubmitDisabled}
          size="icon"
          type="submit"
        >
          <ArrowUpIcon />
        </Button>
      </div>
    </fetcher.Form>
  );
}
