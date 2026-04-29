import { ArrowUpIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { data, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import type { GitHubRepoItem } from "#components/repo-picker.js";

import { BranchPicker } from "#components/branch-picker.js";
import { RepoPicker } from "#components/repo-picker.js";
import { Button } from "#components/ui/button.js";
import { Textarea } from "#components/ui/textarea.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { sessionBootstrapperWorker } from "#workers/.server/session-bootstrapper/index.js";
import { sessionTitlerWorker } from "#workers/.server/session-titler/index.js";

import type { Route } from "./+types/_route";

const requestSchema = z.object({
  baseBranch: z.string().min(1, "Branch is required"),
  prompt: z.string().min(1, "Prompt is required"),
  repoFullName: z
    .string()
    .min(1, "Repository is required")
    .regex(/^[^/]+\/[^/]+$/, "Repository must be in owner/name form"),
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
      baseBranch: result.data.baseBranch,
      id: sessionId,
      initialPrompt: result.data.prompt,
      repoFullName: result.data.repoFullName,
      updatedAt: new Date(),
      userId: user.id,
    })
    .execute();

  // Kicks off session bootstrap (sandbox + opencode session) and the
  // initial-prompt dispatch in a background job. The bootstrapper enqueues
  // the event pump once the sandbox is ready, so follow-ups can start
  // streaming as soon as the pump picks up. This action returns
  // immediately after enqueuing — the session page subscribes to events
  // via Zero. The titler runs in parallel: it doesn't need the sandbox and
  // finishes well before bootstrap, so the sidebar gets a friendly title
  // shortly after creation. A titler failure won't affect session usability
  // — the sidebar falls back to the raw prompt.
  await Promise.all([
    sessionBootstrapperWorker.enqueue(
      {
        baseBranch: result.data.baseBranch,
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
  const isSubmitting = fetcher.state !== "idle";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<null | string>(null);
  const [prompt, setPrompt] = useState("");
  const isSubmitDisabled =
    !selectedRepo || !selectedBranch || isSubmitting || !prompt.trim();

  const handleSelectRepo = (repo: GitHubRepoItem) => {
    setSelectedRepo(repo);
    // Default the branch to the repo's default branch on selection so the
    // user can submit immediately. They can still pick a different branch
    // afterwards.
    setSelectedBranch(repo.defaultBranch);
  };

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
        {selectedBranch && (
          <input name="baseBranch" type="hidden" value={selectedBranch} />
        )}

        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5">
          <RepoPicker onChange={handleSelectRepo} value={selectedRepo} />
          <BranchPicker
            defaultBranch={selectedRepo?.defaultBranch ?? null}
            onChange={setSelectedBranch}
            repoFullName={selectedRepo?.fullName ?? null}
            value={selectedBranch}
          />
        </div>
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
