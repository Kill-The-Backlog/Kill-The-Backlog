/*
  Warnings:

  - The values [resuming] on the enum `SandboxStatus` will be removed. Any
    sessions currently in that status are treated as mid-transition and
    migrated to `errored` so the new schema doesn't carry stale values.
*/
-- Collapse any existing `resuming` rows before dropping the enum value.
UPDATE "Session" SET "sandboxStatus" = 'errored' WHERE "sandboxStatus" = 'resuming';

-- AlterEnum (drop value by rebuilding the type)
BEGIN;
CREATE TYPE "SandboxStatus_new" AS ENUM ('idle', 'provisioning', 'ready', 'pausing', 'paused', 'terminated', 'errored');
ALTER TABLE "Session" ALTER COLUMN "sandboxStatus" DROP DEFAULT;
ALTER TABLE "Session" ALTER COLUMN "sandboxStatus" TYPE "SandboxStatus_new" USING ("sandboxStatus"::text::"SandboxStatus_new");
ALTER TYPE "SandboxStatus" RENAME TO "SandboxStatus_old";
ALTER TYPE "SandboxStatus_new" RENAME TO "SandboxStatus";
DROP TYPE "SandboxStatus_old";
ALTER TABLE "Session" ALTER COLUMN "sandboxStatus" SET DEFAULT 'idle';
COMMIT;
