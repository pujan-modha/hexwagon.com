-- Remove deprecated port link columns in favor of a single canonical repository URL.
ALTER TABLE "Port"
  DROP COLUMN "websiteUrl",
  DROP COLUMN "installUrl";
