import { useEffect, useRef } from "react";
import { data, useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import type { ProviderApiKeyStatus } from "#lib/.server/provider-api-keys/api-keys.js";
import type { ProviderId } from "#lib/opencode/models.js";

import { Badge } from "#components/ui/badge.js";
import { Button } from "#components/ui/button.js";
import { Input } from "#components/ui/input.js";
import { requireUser } from "#lib/.server/auth/auth-context.js";
import {
  clearProviderApiKey,
  queryProviderApiKeyStatuses,
  saveProviderApiKey,
} from "#lib/.server/provider-api-keys/api-keys.js";
import { getProvider, PROVIDER_IDS } from "#lib/opencode/models.js";

import type { Route } from "./+types/_route";

import { HeaderSlot } from "../header-slot.js";

const requestSchema = z.discriminatedUnion("intent", [
  z.object({
    apiKey: z.string().trim().min(1, "API key is required"),
    intent: z.literal("save"),
    provider: z.enum(PROVIDER_IDS),
  }),
  z.object({
    intent: z.literal("clear"),
    provider: z.enum(PROVIDER_IDS),
  }),
]);

function labelForProvider(provider: ProviderId): string {
  return getProvider(provider).label;
}

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);
  return { providerApiKeys: await queryProviderApiKeyStatuses(user.id) };
};

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

  if (result.data.intent === "clear") {
    await clearProviderApiKey({
      provider: result.data.provider,
      userId: user.id,
    });
    return data({
      message: `${labelForProvider(result.data.provider)} API key cleared`,
      ok: true,
    });
  }

  await saveProviderApiKey({
    apiKey: result.data.apiKey,
    provider: result.data.provider,
    userId: user.id,
  });
  return data({
    message: `${labelForProvider(result.data.provider)} API key saved`,
    ok: true,
  });
};

export default function Route({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <HeaderSlot>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">Settings</h1>
        </div>
      </HeaderSlot>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Provider API keys
        </h2>
        <p className="text-muted-foreground max-w-2xl text-sm/relaxed">
          Store Anthropic and OpenAI keys for new coding sessions. Keys are
          encrypted before they are written to the database, and the full value
          is never sent back to the browser.
        </p>
      </div>

      <div className="grid gap-3">
        {loaderData.providerApiKeys.map((providerApiKey) => (
          <ProviderApiKeyCard
            key={providerApiKey.provider}
            providerApiKey={providerApiKey}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderApiKeyCard({
  providerApiKey,
}: {
  providerApiKey: ProviderApiKeyStatus;
}) {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = fetcher.state !== "idle";
  const provider = getProvider(providerApiKey.provider);
  const providerLabel = provider.label;

  useEffect(() => {
    if (!fetcher.data) return;
    if ("error" in fetcher.data) {
      toast.error(fetcher.data.error);
      return;
    }

    toast.success(fetcher.data.message);
    formRef.current?.reset();
  }, [fetcher.data]);

  return (
    <section className="bg-card text-card-foreground rounded-xl border p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{providerLabel}</h3>
            <ProviderStatusBadge providerApiKey={providerApiKey} />
          </div>
          <p className="text-muted-foreground text-xs/relaxed">
            {provider.description}
          </p>
          <p className="text-muted-foreground text-xs/relaxed">
            {statusText(providerApiKey)}
          </p>
        </div>

        {providerApiKey.isSaved && (
          <fetcher.Form method="post">
            <input name="intent" type="hidden" value="clear" />
            <input
              name="provider"
              type="hidden"
              value={providerApiKey.provider}
            />
            <Button disabled={isSubmitting} type="submit" variant="outline">
              Clear
            </Button>
          </fetcher.Form>
        )}
      </div>

      <fetcher.Form className="mt-4 flex gap-2" method="post" ref={formRef}>
        <input name="intent" type="hidden" value="save" />
        <input name="provider" type="hidden" value={providerApiKey.provider} />
        <Input
          autoComplete="off"
          className="font-mono"
          disabled={isSubmitting}
          name="apiKey"
          placeholder={provider.apiKeyPlaceholder}
          type="password"
        />
        <Button disabled={isSubmitting} type="submit">
          {providerApiKey.isSaved ? "Update" : "Save"}
        </Button>
      </fetcher.Form>
    </section>
  );
}

function ProviderStatusBadge({
  providerApiKey,
}: {
  providerApiKey: ProviderApiKeyStatus;
}) {
  if (providerApiKey.isSaved) {
    return <Badge variant="secondary">Saved</Badge>;
  }

  if (providerApiKey.hasFallback) {
    return <Badge variant="outline">Server fallback</Badge>;
  }

  return <Badge variant="destructive">Missing</Badge>;
}

function statusText(providerApiKey: ProviderApiKeyStatus): string {
  if (providerApiKey.keyPreview) {
    return `Saved key ${providerApiKey.keyPreview} will be used for new sessions.`;
  }

  if (providerApiKey.hasFallback) {
    return "No user key is saved, so new sessions use the configured server fallback.";
  }

  return "No key is configured. Add one before starting sessions with this provider.";
}
