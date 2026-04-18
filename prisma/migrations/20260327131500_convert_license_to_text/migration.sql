-- Add plain text license fields
ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "license" TEXT;
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "license" TEXT;
ALTER TABLE "Port" ADD COLUMN IF NOT EXISTS "license" TEXT;

-- Backfill from License table when available
UPDATE "Theme" AS t
SET "license" = l."name"
FROM "License" AS l
WHERE t."licenseId" = l."id" AND t."license" IS NULL;

UPDATE "Platform" AS p
SET "license" = l."name"
FROM "License" AS l
WHERE p."licenseId" = l."id" AND p."license" IS NULL;

UPDATE "Port" AS p
SET "license" = l."name"
FROM "License" AS l
WHERE p."licenseId" = l."id" AND p."license" IS NULL;

-- Remove foreign keys and legacy relation columns
ALTER TABLE "Theme" DROP CONSTRAINT IF EXISTS "Theme_licenseId_fkey";
ALTER TABLE "Platform" DROP CONSTRAINT IF EXISTS "Platform_licenseId_fkey";
ALTER TABLE "Port" DROP CONSTRAINT IF EXISTS "Port_licenseId_fkey";

ALTER TABLE "Theme" DROP COLUMN IF EXISTS "licenseId";
ALTER TABLE "Platform" DROP COLUMN IF EXISTS "licenseId";
ALTER TABLE "Port" DROP COLUMN IF EXISTS "licenseId";

-- Remove obsolete License table
DROP TABLE IF EXISTS "License";
