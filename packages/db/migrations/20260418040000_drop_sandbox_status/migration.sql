/*
  Drops the `sandboxStatus` column and `SandboxStatus` enum. The "is this
  session usable?" signal now lives entirely in `Session.errorMessage`
  (non-null = errored). Intermediate lifecycle states (provisioning,
  ready, pausing, paused) had no consumers outside the workers that wrote
  them, so the column is being retired rather than maintained.
*/
ALTER TABLE "Session" DROP COLUMN "sandboxStatus";

DROP TYPE "SandboxStatus";
