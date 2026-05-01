import type { QueryRowType } from "@rocicorp/zero";

import { ArrowUpIcon, GitPullRequestIcon } from "@phosphor-icons/react";
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
import { assertModelId } from "#lib/opencode/models.js";
import { cn } from "#lib/utils/cn.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { HeaderSlot } from "../../header-slot.js";
import { Details } from "./details.js";
import { Messages } from "./messages.js";

type SessionRow = NonNullable<QueryRowType<typeof queries.sessions.one>>;

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
    .select(["id", "e2bSandboxId", "model", "opencodeSessionId"])
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
    model: assertModelId(session.model),
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

  // The parent route remounts `Composer` on session change via `key`, so this
  // captures whether the PR was already present when the user landed on this
  // session — allowing us to animate only when one *appears* mid-session.
  const hadPrOnMountRef = useRef(session.prNumber !== null);

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
        {session.prNumber !== null && (
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
              className="bg-background rounded-full"
            >
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
            </div>
          </div>
        )}
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
