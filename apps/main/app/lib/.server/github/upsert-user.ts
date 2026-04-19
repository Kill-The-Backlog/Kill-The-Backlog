import type { DB } from "@ktb/db/client";
import type { Insertable, Transaction } from "@ktb/db/kysely-types";
import type { User } from "@ktb/db/types";

import { db } from "#lib/.server/clients/db.js";

import type { GitHubUserProfile } from "./oauth";

type Trx = Transaction<DB>;

/**
 * Creates or updates user in database with GitHub OAuth data.
 */
export async function upsertUserWithGitHubAccount(
  profile: GitHubUserProfile,
  accessToken: string,
): Promise<{ id: number; isNewUser: boolean }> {
  return db.transaction().execute(async (trx) => {
    const existing = await findGitHubAccount(trx, profile.githubId);

    if (existing) {
      await refreshAccount(trx, existing, profile, accessToken);
      return { id: existing.userId, isNewUser: false };
    }

    const user = await trx
      .insertInto("User")
      .values({
        ...userProfileFields(profile),
        isStaff: false,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("GitHubAccount")
      .values({
        githubId: profile.githubId,
        login: profile.login,
        oauthAccessToken: accessToken,
        updatedAt: new Date(),
        userId: user.id,
      })
      .execute();

    return { id: user.id, isNewUser: true };
  });
}

function findGitHubAccount(trx: Trx, githubId: number) {
  return trx
    .selectFrom("GitHubAccount")
    .select(["GitHubAccount.id", "GitHubAccount.userId"])
    .where("GitHubAccount.githubId", "=", githubId)
    .executeTakeFirst();
}

async function refreshAccount(
  trx: Trx,
  account: { id: number; userId: number },
  profile: GitHubUserProfile,
  accessToken: string,
) {
  await trx
    .updateTable("User")
    .set(userProfileFields(profile))
    .where("id", "=", account.userId)
    .execute();

  await trx
    .updateTable("GitHubAccount")
    .set({
      login: profile.login,
      oauthAccessToken: accessToken,
      updatedAt: new Date(),
    })
    .where("id", "=", account.id)
    .execute();
}

function userProfileFields(
  profile: GitHubUserProfile,
): Pick<Insertable<User>, "avatarUrl" | "displayName" | "email" | "updatedAt"> {
  return {
    avatarUrl: profile.avatarUrl,
    displayName: profile.name ?? profile.login,
    email: profile.email,
    updatedAt: new Date(),
  };
}
