import type { DB } from "@ktb/db/client";
import type { Transaction } from "@ktb/db/kysely-types";

import { db } from "#lib/.server/clients/db.js";

import type { GoogleTokenPayload, GoogleTokens } from "./google-oauth";

type Trx = Transaction<DB>;

/**
 * Creates or updates user in database with Google OAuth data.
 */
export async function upsertUserWithGoogleAccount(
  payload: GoogleTokenPayload,
  tokens: GoogleTokens,
): Promise<{ id: number; isNewUser: boolean }> {
  return db.transaction().execute(async (trx) => {
    const existing = await findGoogleAccount(trx, payload.sub);

    if (existing) {
      await refreshAccount(trx, existing, payload, tokens);
      return { id: existing.userId, isNewUser: false };
    }

    const user = await trx
      .insertInto("User")
      .values({
        ...userProfileFields(payload),
        isStaff: false,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("GoogleAccount")
      .values({
        ...googleAccountTokenFields(tokens),
        googleId: payload.sub,
        userId: user.id,
      })
      .execute();

    return { id: user.id, isNewUser: true };
  });
}

// === INTERNAL HELPERS ===

function findGoogleAccount(trx: Trx, googleId: string) {
  return trx
    .selectFrom("GoogleAccount")
    .select(["GoogleAccount.id", "GoogleAccount.userId"])
    .where("GoogleAccount.googleId", "=", googleId)
    .executeTakeFirst();
}

function googleAccountTokenFields(tokens: GoogleTokens) {
  return {
    oauthAccessToken: tokens.access_token,
    oauthExpiry: String(tokens.expiry_date),
    oauthRefreshToken: tokens.refresh_token,
    updatedAt: new Date(),
  };
}

async function refreshAccount(
  trx: Trx,
  account: { id: number; userId: number },
  payload: GoogleTokenPayload,
  tokens: GoogleTokens,
) {
  await trx
    .updateTable("User")
    .set(userProfileFields(payload))
    .where("id", "=", account.userId)
    .execute();

  await trx
    .updateTable("GoogleAccount")
    .set(googleAccountTokenFields(tokens))
    .where("id", "=", account.id)
    .execute();
}

function userProfileFields(payload: GoogleTokenPayload) {
  return {
    avatarUrl: payload.picture ?? null,
    displayName: payload.name,
    email: payload.email,
    updatedAt: new Date(),
  };
}
