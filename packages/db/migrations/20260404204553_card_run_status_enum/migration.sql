-- CreateEnum
CREATE TYPE "CardRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- AlterTable
ALTER TABLE "CardRun"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" SET DATA TYPE "CardRunStatus" USING "status"::"CardRunStatus",
    ALTER COLUMN "status" SET DEFAULT 'pending'::"CardRunStatus";
