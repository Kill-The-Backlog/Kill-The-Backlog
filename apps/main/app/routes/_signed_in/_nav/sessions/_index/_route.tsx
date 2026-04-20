import { ArrowUpIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { data, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import type { GitHubRepoItem } from "#components/repo-picker.js";

import { RepoPicker } from "#components/repo-picker.js";
import { Button } from "#components/ui/button.js";
import { Textarea } from "#components/ui/textarea.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { sessionBootstrapperWorker } from "#workers/.server/session-bootstrapper/index.js";

import type { Route } from "./+types/_route";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export const action = async ({ context, request }: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const formData = await request.formData();

  const result = requestSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return data(
      { error: result.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const sessionId = crypto.randomUUID();

  await db
    .insertInto("Session")
    .values({
      id: sessionId,
      initialPrompt: result.data.prompt,
      updatedAt: new Date(),
      userId: user.id,
    })
    .execute();

  // Kicks off session bootstrap (sandbox + opencode session) and the
  // initial-prompt dispatch in a background job. The bootstrapper enqueues
  // the event pump once the sandbox is ready, so follow-ups can start
  // streaming as soon as the pump picks up. This action returns
  // immediately after enqueuing — the session page subscribes to events
  // via Zero.
  await sessionBootstrapperWorker.enqueue(
    { initialPrompt: result.data.prompt, sessionId },
    { jobId: sessionId, replaceFinished: true },
  );

  throw redirect(`/sessions/${sessionId}`);
};

export default function Route() {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const isSubmitting = fetcher.state !== "idle";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);

  useEffect(() => {
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
      textareaRef.current?.focus();
    }
  }, [fetcher.data]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <fetcher.Form className="relative w-full max-w-2xl" method="post">
        <Textarea
          className="min-h-24 resize-none pb-12"
          disabled={isSubmitting}
          name="prompt"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask or build anything"
          ref={textareaRef}
        />

        <RepoPicker
          className="absolute bottom-1.5 left-1.5"
          onChange={setSelectedRepo}
          value={selectedRepo}
        />
        <Button
          className="absolute right-1.5 bottom-1.5"
          disabled={isSubmitting}
          size="icon"
          type="submit"
        >
          <ArrowUpIcon />
        </Button>
      </fetcher.Form>
    </div>
  );
}
