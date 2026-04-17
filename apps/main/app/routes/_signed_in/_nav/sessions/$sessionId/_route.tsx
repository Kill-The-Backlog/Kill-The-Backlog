import { ArrowUpIcon } from "@phosphor-icons/react";
import { useQuery } from "@rocicorp/zero/react";
import { useEffect, useRef } from "react";
import { data, Navigate, useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "#components/ui/alert.js";
import { Button } from "#components/ui/button.js";
import { Input } from "#components/ui/input.js";
import { Spinner } from "#components/ui/spinner.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { sandboxSupervisorWorker } from "#workers/.server/sandbox-supervisor/index.js";
import { notifySession } from "#workers/.server/sandbox-supervisor/notify.js";
import { queries } from "#zero/queries.js";

import type { Route } from "./+types/_route";

import { Message } from "./message.js";
import { UserPrompt } from "./user-prompt.js";

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

  const owned = await db
    .selectFrom("Session")
    .select("id")
    .where("id", "=", sessionId)
    .where("userId", "=", user.id)
    .executeTakeFirst();
  if (!owned) {
    throw data({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.formData();
  const result = requestSchema.safeParse({ prompt: body.get("prompt") });
  if (!result.success) {
    return data(
      { error: result.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("SessionCommand")
      .values({
        id: crypto.randomUUID(),
        payload: { text: result.data.prompt },
        sessionId,
        type: "send-prompt",
        updatedAt: new Date(),
      })
      .execute();

    await tx
      .updateTable("Session")
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where("id", "=", sessionId)
      .execute();
  });

  await sandboxSupervisorWorker.enqueue(
    { sessionId },
    { jobId: sessionId, replaceFinished: true },
  );
  await notifySession(sessionId);

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <UserPrompt prompt={session.prompt} />

      {session.messages.length > 0 && (
        <div className="flex flex-col gap-3">
          {session.messages
            .filter((m) => m.role === "assistant")
            .map((message) => (
              <Message key={message.id} message={message} />
            ))}
        </div>
      )}

      {session.errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{session.errorMessage}</AlertDescription>
        </Alert>
      )}

      <FollowUpForm />
    </div>
  );
}

function FollowUpForm() {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const isSubmitting = fetcher.state !== "idle";
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const actionData = fetcher.data;
  useEffect(() => {
    if (actionData && "error" in actionData && actionData.error) {
      toast.error(actionData.error);
      inputRef.current?.focus();
      return;
    }
    if (actionData && "ok" in actionData && actionData.ok) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [actionData]);

  return (
    <fetcher.Form
      className="flex w-full items-center gap-1.5"
      method="post"
      ref={formRef}
    >
      <Input
        disabled={isSubmitting}
        name="prompt"
        placeholder="Follow up"
        ref={inputRef}
        type="text"
      />
      <Button disabled={isSubmitting} size="icon" type="submit">
        <ArrowUpIcon />
      </Button>
    </fetcher.Form>
  );
}
