-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passphraseHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "targetPct" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "lastPriceUpdate" TIMESTAMP(3),

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSettings" (
    "userId" TEXT NOT NULL,
    "totalInvestmentTarget" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PortfolioSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "ticker" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("ticker")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE INDEX "Stock_userId_idx" ON "Stock"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_userId_ticker_key" ON "Stock"("userId", "ticker");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSettings" ADD CONSTRAINT "PortfolioSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
