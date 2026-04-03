-- AlterTable: add number column with a temporary default
ALTER TABLE "KanbanCard" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign sequential numbers per repo based on creation order
UPDATE "KanbanCard" AS kc
SET "number" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "repoId" ORDER BY "createdAt") AS rn
  FROM "KanbanCard"
) AS sub
WHERE kc."id" = sub."id";

-- Remove the temporary default
ALTER TABLE "KanbanCard" ALTER COLUMN "number" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "KanbanCard_repoId_number_key" ON "KanbanCard"("repoId", "number");
