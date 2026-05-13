-- CreateTable
CREATE TABLE "UserProviderApiKey" (
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyPreview" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserProviderApiKey_pkey" PRIMARY KEY ("userId","provider")
);

-- AddForeignKey
ALTER TABLE "UserProviderApiKey" ADD CONSTRAINT "UserProviderApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
