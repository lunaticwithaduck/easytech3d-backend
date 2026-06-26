-- CreateEnum
CREATE TYPE "PrintQuoteStatus" AS ENUM ('NEW', 'QUOTED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "PrintQuote" (
    "id" TEXT NOT NULL,
    "quoteNumber" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fileNames" TEXT[],
    "material" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "infill" INTEGER NOT NULL,
    "totalVolumeCm3" DOUBLE PRECISION NOT NULL,
    "totalWeightG" DOUBLE PRECISION NOT NULL,
    "dims" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "PrintQuoteStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintQuote_quoteNumber_key" ON "PrintQuote"("quoteNumber");
