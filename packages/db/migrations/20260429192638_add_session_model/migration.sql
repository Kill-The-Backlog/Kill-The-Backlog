-- AlterTable
-- Backfill existing rows with the default model so the column can land as
-- NOT NULL, then drop the default so future inserts are forced to choose
-- explicitly. Matches the always-explicit pattern used elsewhere on the
-- Session table.
ALTER TABLE "Session" ADD COLUMN "model" TEXT NOT NULL DEFAULT 'claude-opus-4-7';
ALTER TABLE "Session" ALTER COLUMN "model" DROP DEFAULT;
