-- AlterTable
ALTER TABLE "PriceCache" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'yahoo';

-- CreateTable
CREATE TABLE "Instrument" (
    "ticker" TEXT NOT NULL,
    "instrumentKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("ticker")
);
