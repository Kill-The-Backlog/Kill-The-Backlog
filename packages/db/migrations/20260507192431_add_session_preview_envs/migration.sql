-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "previewErrorMessage" TEXT,
ADD COLUMN     "previewLogs" JSONB,
ADD COLUMN     "previewProcessId" INTEGER,
ADD COLUMN     "previewStatus" TEXT;
