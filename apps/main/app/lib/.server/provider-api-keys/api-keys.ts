import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import type { ProviderId } from "#lib/opencode/models.js";

import { db } from "#lib/.server/clients/db.js";
import { serverEnv } from "#lib/.server/env/server.js";
import { MODEL_PROVIDERS } from "#lib/opencode/models.js";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export type ProviderApiKeyStatus = {
  hasFallback: boolean;
  isSaved: boolean;
  keyPreview: null | string;
  provider: ProviderId;
};

export async function clearProviderApiKey({
  provider,
  userId,
}: {
  provider: ProviderId;
  userId: number;
}): Promise<void> {
  await db
    .deleteFrom("UserProviderApiKey")
    .where("userId", "=", userId)
    .where("provider", "=", provider)
    .execute();
}

export async function hasConfiguredProviderApiKey({
  providerID,
  userId,
}: {
  providerID: ProviderId;
  userId: number;
}): Promise<boolean> {
  const saved = await db
    .selectFrom("UserProviderApiKey")
    .select("provider")
    .where("userId", "=", userId)
    .where("provider", "=", providerID)
    .executeTakeFirst();

  return Boolean(saved) || Boolean(getFallbackApiKey(providerID));
}

export async function queryProviderApiKeyStatuses(
  userId: number,
): Promise<ProviderApiKeyStatus[]> {
  const rows = await db
    .selectFrom("UserProviderApiKey")
    .select(["keyPreview", "provider"])
    .where("userId", "=", userId)
    .execute();

  return MODEL_PROVIDERS.map((provider) => {
    const saved = rows.find((row) => row.provider === provider.id);
    const hasFallback = Boolean(getFallbackApiKey(provider.id));
    return {
      hasFallback,
      isSaved: Boolean(saved),
      keyPreview: saved?.keyPreview ?? null,
      provider: provider.id,
    };
  });
}

export async function resolveProviderApiKey({
  providerID,
  userId,
}: {
  providerID: ProviderId;
  userId: number;
}): Promise<null | string> {
  const saved = await db
    .selectFrom("UserProviderApiKey")
    .select("encryptedKey")
    .where("userId", "=", userId)
    .where("provider", "=", providerID)
    .executeTakeFirst();

  if (saved) {
    return decryptProviderApiKey(saved.encryptedKey);
  }

  return getFallbackApiKey(providerID);
}

export async function saveProviderApiKey({
  apiKey,
  provider,
  userId,
}: {
  apiKey: string;
  provider: ProviderId;
  userId: number;
}): Promise<void> {
  const trimmedApiKey = apiKey.trim();
  const encryptedKey = encryptProviderApiKey(trimmedApiKey);
  const keyPreview = previewProviderApiKey(trimmedApiKey);
  const now = new Date();

  await db
    .insertInto("UserProviderApiKey")
    .values({
      encryptedKey,
      keyPreview,
      provider,
      updatedAt: now,
      userId,
    })
    .onConflict((oc) =>
      oc.columns(["userId", "provider"]).doUpdateSet({
        encryptedKey,
        keyPreview,
        updatedAt: now,
      }),
    )
    .execute();
}

function decryptProviderApiKey(encryptedApiKey: string): string {
  const [ivText, authTagText, ciphertextText] = encryptedApiKey.split(".");
  if (!ivText || !authTagText || !ciphertextText) {
    throw new Error("Provider API key ciphertext is malformed");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(ivText, "base64url"),
    { authTagLength: AUTH_TAG_BYTES },
  );
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encryptionKey(): Buffer {
  return createHash("sha256")
    .update(serverEnv.PROVIDER_API_KEY_ENCRYPTION_SECRET)
    .digest();
}

function encryptProviderApiKey(apiKey: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function getFallbackApiKey(provider: ProviderId): null | string {
  switch (provider) {
    case "anthropic":
      return serverEnv.ANTHROPIC_API_KEY;
    case "openai":
      return serverEnv.OPENAI_API_KEY ?? null;
  }
}

function previewProviderApiKey(apiKey: string): string {
  return `**** ${apiKey.slice(-4)}`;
}
