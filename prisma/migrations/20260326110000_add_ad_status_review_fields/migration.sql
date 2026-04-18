-- AlterEnum
ALTER TYPE "AdType" ADD VALUE IF NOT EXISTS 'Listing';
ALTER TYPE "AdType" ADD VALUE IF NOT EXISTS 'Sidebar';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AdStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Ad"
ADD COLUMN IF NOT EXISTS "status" "AdStatus" NOT NULL DEFAULT 'Approved',
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "adminNote" TEXT;

-- Backfill existing ads as approved
UPDATE "Ad"
SET "status" = 'Approved', "approvedAt" = COALESCE("approvedAt", "createdAt")
WHERE "status" IS NULL OR "status" <> 'Pending';

-- Make new ads pending by default
ALTER TABLE "Ad" ALTER COLUMN "status" SET DEFAULT 'Pending';