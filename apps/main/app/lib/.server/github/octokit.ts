import { Octokit } from "@octokit/rest";

import { db } from "#lib/.server/clients/db.js";

export async function getUserOctokit(userId: number): Promise<null | Octokit> {
  const account = await db
    .selectFrom("GitHubAccount")
    .select("oauthAccessToken")
    .where("userId", "=", userId)
    .executeTakeFirst();

  if (!account) return null;

  return new Octokit({ auth: account.oauthAccessToken });
}
