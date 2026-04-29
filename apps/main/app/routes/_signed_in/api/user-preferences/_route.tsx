import { data } from "react-router";
import { z } from "zod";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { MODEL_IDS } from "#lib/opencode/models.js";

import type { Route } from "./+types/_route";

const requestSchema = z.object({
  lastBaseBranch: z.string().min(1).optional(),
  lastModel: z.enum(MODEL_IDS).optional(),
  lastRepoFullName: z
    .string()
    .min(1)
    .regex(/^[^/]+\/[^/]+$/)
    .optional(),
});

export type UserPreferencesPatch = z.infer<typeof requestSchema>;

export const action = async ({ context, request }: Route.ActionArgs) => {
  const { user } = await requireUser(context);
  const body: unknown = await request.json();
  const patch = requestSchema.parse(body);

  await queryUpsertUserPreferences({ patch, userId: user.id });
  return data({ ok: true });
};

async function queryUpsertUserPreferences({
  patch,
  userId,
}: {
  patch: UserPreferencesPatch;
  userId: number;
}) {
  const now = new Date();

  // Spreading `patch` on both sides gives partial-write semantics: Kysely
  // filters undefined values, so omitted keys are excluded from the INSERT
  // (the column's DB default applies — NULL for our nullable pref fields)
  // and excluded from the SET on conflict (existing row values are left
  // untouched). This keeps concurrent writes for different prefs from
  // clobbering each other.
  await db
    .insertInto("UserPreferences")
    .values({ ...patch, updatedAt: now, userId })
    .onConflict((oc) =>
      oc.column("userId").doUpdateSet({ ...patch, updatedAt: now }),
    )
    .execute();
}
