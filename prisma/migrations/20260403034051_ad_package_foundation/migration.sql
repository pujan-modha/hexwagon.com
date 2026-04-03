-- CreateEnum
CREATE TYPE "AdBillingCycle" AS ENUM ('Weekly', 'Monthly');

-- CreateEnum
CREATE TYPE "AdSlot" AS ENUM ('Banner', 'Listing', 'Sidebar', 'Footer');

-- AlterTable
ALTER TABLE "Ad" ADD COLUMN     "billingCycle" "AdBillingCycle",
ADD COLUMN     "packageBasePriceCents" INTEGER,
ADD COLUMN     "packageDiscountedPriceCents" INTEGER,
ADD COLUMN     "refundAmountCents" INTEGER,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeRefundId" TEXT,
ADD COLUMN     "targetingTargetCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetingTotalPriceCents" INTEGER,
ADD COLUMN     "targetingUnitPriceCents" INTEGER;

-- CreateTable
CREATE TABLE "AdPackageConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "weeklyBasePriceCents" INTEGER NOT NULL DEFAULT 0,
    "weeklyDiscountedPriceCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyBasePriceCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyDiscountedPriceCents" INTEGER NOT NULL DEFAULT 0,
    "weeklyTargetUnitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyTargetUnitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPackageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdFixedSlotOverride" (
    "slot" "AdSlot" NOT NULL,
    "adId" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdFixedSlotOverride_pkey" PRIMARY KEY ("slot")
);

-- CreateTable
CREATE TABLE "_AdTargetThemes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdTargetThemes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AdTargetPlatforms" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdTargetPlatforms_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "AdFixedSlotOverride_adId_idx" ON "AdFixedSlotOverride"("adId");

-- CreateIndex
CREATE INDEX "_AdTargetThemes_B_index" ON "_AdTargetThemes"("B");

-- CreateIndex
CREATE INDEX "_AdTargetPlatforms_B_index" ON "_AdTargetPlatforms"("B");

-- CreateIndex
CREATE INDEX "Ad_status_paidAt_startsAt_endsAt_idx" ON "Ad"("status", "paidAt", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Ad_billingCycle_idx" ON "Ad"("billingCycle");

-- AddForeignKey
ALTER TABLE "AdPackageConfig" ADD CONSTRAINT "AdPackageConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdFixedSlotOverride" ADD CONSTRAINT "AdFixedSlotOverride_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdFixedSlotOverride" ADD CONSTRAINT "AdFixedSlotOverride_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdTargetThemes" ADD CONSTRAINT "_AdTargetThemes_A_fkey" FOREIGN KEY ("A") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdTargetThemes" ADD CONSTRAINT "_AdTargetThemes_B_fkey" FOREIGN KEY ("B") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdTargetPlatforms" ADD CONSTRAINT "_AdTargetPlatforms_A_fkey" FOREIGN KEY ("A") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdTargetPlatforms" ADD CONSTRAINT "_AdTargetPlatforms_B_fkey" FOREIGN KEY ("B") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
