-- Create enum for theme maintainer claim review state.
CREATE TYPE "ThemeMaintainerClaimStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- Create claim table for users requesting maintainer access to a theme.
CREATE TABLE "ThemeMaintainerClaim" (
  "id" TEXT NOT NULL,
  "claimantName" TEXT NOT NULL,
  "claimantEmail" TEXT NOT NULL,
  "claimantUrl" TEXT,
  "details" TEXT,
  "status" "ThemeMaintainerClaimStatus" NOT NULL DEFAULT 'Pending',
  "adminNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "themeId" TEXT NOT NULL,
  "requesterId" TEXT,
  "reviewerId" TEXT,
  CONSTRAINT "ThemeMaintainerClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThemeMaintainerClaim_themeId_idx" ON "ThemeMaintainerClaim"("themeId");
CREATE INDEX "ThemeMaintainerClaim_requesterId_idx" ON "ThemeMaintainerClaim"("requesterId");
CREATE INDEX "ThemeMaintainerClaim_reviewerId_idx" ON "ThemeMaintainerClaim"("reviewerId");
CREATE INDEX "ThemeMaintainerClaim_status_idx" ON "ThemeMaintainerClaim"("status");

ALTER TABLE "ThemeMaintainerClaim"
  ADD CONSTRAINT "ThemeMaintainerClaim_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThemeMaintainerClaim"
  ADD CONSTRAINT "ThemeMaintainerClaim_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ThemeMaintainerClaim"
  ADD CONSTRAINT "ThemeMaintainerClaim_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
