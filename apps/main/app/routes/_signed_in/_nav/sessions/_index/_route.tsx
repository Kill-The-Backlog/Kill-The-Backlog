import { ArrowUpIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { data, redirect, useFetcher, useLoaderData } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import type { GitHubRepoItem } from "#components/repo-picker.js";

import { RepoPicker } from "#components/repo-picker.js";
import { Button } from "#components/ui/button.js";
import { Textarea } from "#components/ui/textarea.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { sessionBootstrapperWorker } from "#workers/.server/session-bootstrapper/index.js";
import { sessionTitlerWorker } from "#workers/.server/session-titler/index.js";

import type { Route } from "./+types/_route";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  repoFullName: z
    .string()
    .min(1, "Repository is required")
    .regex(/^[^/]+\/[^/]+$/, "Repository must be in owner/name form"),
});

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);

  const dbUser = await db
    .selectFrom("User")
    .select("selectedRepoFullName")
    .where("id", "=", user.id)
    .executeTakeFirst();

  return { selectedRepoFullName: dbUser?.selectedRepoFullName ?? null };
};

export const action = async ({ context, request }: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "selectRepo") {
    const repoFullName = formData.get("repoFullName") as string | null;

    await db
      .updateTable("User")
      .set({ selectedRepoFullName: repoFullName })
      .where("id", "=", user.id)
      .execute();

    return { success: true };
  }

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
      repoFullName: result.data.repoFullName,
      updatedAt: new Date(),
      userId: user.id,
    })
    .execute();

  await Promise.all([
    sessionBootstrapperWorker.enqueue(
      {
        initialPrompt: result.data.prompt,
        repoFullName: result.data.repoFullName,
        sessionId,
        userId: user.id,
      },
      { jobId: sessionId, replaceFinished: true },
    ),
    sessionTitlerWorker.enqueue(
      { initialPrompt: result.data.prompt, sessionId },
      { jobId: sessionId, replaceFinished: true },
    ),
  ]);

  throw redirect(`/sessions/${sessionId}`);
};

export default function Route() {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const { selectedRepoFullName } = useLoaderData<typeof loader>();
  const isSubmitting = fetcher.state !== "idle";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [prompt, setPrompt] = useState("");
  const isSubmitDisabled = !selectedRepo || isSubmitting || !prompt.trim();

  useEffect(() => {
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
      textareaRef.current?.focus();
    }
  }, [fetcher.data]);

  const handleRepoChange = (repo: GitHubRepoItem) => {
    setSelectedRepo(repo);
    fetcher.submit(
      { intent: "selectRepo", repoFullName: repo.fullName },
      { method: "post" },
    );
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <fetcher.Form className="relative w-full max-w-2xl" method="post">
        <Textarea
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

        {selectedRepo && (
          <input
            name="repoFullName"
            type="hidden"
            value={selectedRepo.fullName}
          />
        )}

        <RepoPicker
          className="absolute bottom-1.5 left-1.5"
          initialFullName={selectedRepoFullName}
          onChange={handleRepoChange}
          value={selectedRepo}
        />
        <Button
          className="absolute right-1.5 bottom-1.5"
          disabled={isSubmitDisabled}
          size="icon"
          type="submit"
        >
          <ArrowUpIcon />
        </Button>
      </fetcher.Form>
    </div>
  );
}
