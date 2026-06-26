-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryType" TEXT NOT NULL DEFAULT 'ADDRESS',
ADD COLUMN     "officeCode" TEXT,
ADD COLUMN     "officeName" TEXT;

-- CreateTable
CREATE TABLE "PrintQuoteFile" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintQuoteFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrintQuoteFile_quoteId_idx" ON "PrintQuoteFile"("quoteId");

-- AddForeignKey
ALTER TABLE "PrintQuoteFile" ADD CONSTRAINT "PrintQuoteFile_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PrintQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

