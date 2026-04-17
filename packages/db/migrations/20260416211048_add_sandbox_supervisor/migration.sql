-- CreateEnum
CREATE TYPE "SandboxStatus" AS ENUM ('idle', 'provisioning', 'ready', 'pausing', 'paused', 'resuming', 'terminated', 'errored');

-- CreateEnum
CREATE TYPE "SessionCommandStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sandboxHeartbeat" TIMESTAMP(3),
ADD COLUMN     "sandboxStatus" "SandboxStatus" NOT NULL DEFAULT 'idle';

-- CreateTable
CREATE TABLE "SessionCommand" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SessionCommandStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionCommand_sessionId_status_createdAt_idx" ON "SessionCommand"("sessionId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "SessionCommand" ADD CONSTRAINT "SessionCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
