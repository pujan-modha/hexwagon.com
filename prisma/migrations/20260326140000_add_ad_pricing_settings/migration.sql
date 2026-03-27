-- CreateTable
CREATE TABLE "AdSpotPricing" (
    "spot" "AdType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdSpotPricing_pkey" PRIMARY KEY ("spot")
);

-- CreateTable
CREATE TABLE "AdConfig" (
    "id" INTEGER NOT NULL,
    "maxDiscountPercentage" INTEGER NOT NULL DEFAULT 30,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdSpotPricing" ADD CONSTRAINT "AdSpotPricing_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdConfig" ADD CONSTRAINT "AdConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default config row
INSERT INTO "AdConfig" ("id", "maxDiscountPercentage")
VALUES (1, 30)
ON CONFLICT ("id") DO NOTHING;
