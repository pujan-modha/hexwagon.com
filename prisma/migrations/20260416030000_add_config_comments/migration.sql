ALTER TABLE "Comment"
  ALTER COLUMN "portId" DROP NOT NULL;

ALTER TABLE "Comment"
  ADD COLUMN "configId" TEXT;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "Config"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX "Comment_configId_idx" ON "Comment"("configId");

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_entity_check"
  CHECK (
    ("portId" IS NOT NULL AND "configId" IS NULL)
    OR ("portId" IS NULL AND "configId" IS NOT NULL)
  );
