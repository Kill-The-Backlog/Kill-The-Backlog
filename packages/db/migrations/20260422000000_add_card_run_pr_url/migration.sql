import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("CardRun")
    .addColumn("prUrl", "text")
    .execute();
}