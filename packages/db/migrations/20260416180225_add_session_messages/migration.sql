-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "summary" JSONB,
ADD COLUMN     "todos" JSONB;

-- CreateTable
CREATE TABLE "SessionMessage" (
    "id" TEXT NOT NULL,
    "opencodeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionMessagePart" (
    "id" TEXT NOT NULL,
    "opencodeId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionMessagePart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionMessage_opencodeId_key" ON "SessionMessage"("opencodeId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionMessagePart_opencodeId_key" ON "SessionMessagePart"("opencodeId");

-- AddForeignKey
ALTER TABLE "SessionMessage" ADD CONSTRAINT "SessionMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMessagePart" ADD CONSTRAINT "SessionMessagePart_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SessionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
