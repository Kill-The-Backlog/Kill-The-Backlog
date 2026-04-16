import { ArrowUpIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { data, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "#components/ui/button.js";
import { Input } from "#components/ui/input.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { createSandboxWorker } from "#workers/.server/create-sandbox/index.js";

import type { Route } from "./+types/_route";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export const action = async ({ context, request }: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const formData = await request.formData();

  const result = requestSchema.safeParse({ prompt: formData.get("prompt") });
  if (!result.success) {
    return data(
      { error: result.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const session = await db
    .insertInto("Session")
    .values({
      id: crypto.randomUUID(),
      prompt: result.data.prompt,
      updatedAt: new Date(),
      userId: user.id,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  await createSandboxWorker.enqueue(
    { sessionId: session.id },
    { jobId: session.id },
  );

  throw redirect(`/sessions/${session.id}`);
};

export default function Route() {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const isSubmitting = fetcher.state !== "idle";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
      inputRef.current?.focus();
    }
  }, [fetcher.data]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <fetcher.Form
        className="flex w-full max-w-2xl items-center gap-1.5"
        method="post"
      >
        <Input
          disabled={isSubmitting}
          name="prompt"
          placeholder="Ask or build anything"
          ref={inputRef}
          type="text"
        />
        <Button disabled={isSubmitting} size="icon" type="submit">
          <ArrowUpIcon />
        </Button>
      </fetcher.Form>
    </div>
  );
}
