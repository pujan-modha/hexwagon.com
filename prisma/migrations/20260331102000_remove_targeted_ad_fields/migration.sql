-- Remove targeted-sidebar ad fields and targeting surcharge settings.
ALTER TABLE "Ad"
  DROP COLUMN IF EXISTS "isTargetedSidebar",
  DROP COLUMN IF EXISTS "targetThemeSlugs",
  DROP COLUMN IF EXISTS "targetPlatformSlugs";

ALTER TABLE "AdConfig"
  DROP COLUMN IF EXISTS "targetingUnitPriceCents";
