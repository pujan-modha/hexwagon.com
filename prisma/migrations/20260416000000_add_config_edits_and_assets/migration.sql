ALTER TABLE "Config"
ADD COLUMN "fonts" JSONB,
ADD COLUMN "screenshots" JSONB;

CREATE TABLE "ConfigEdit" (
  "id" TEXT NOT NULL,
  "diff" JSONB NOT NULL,
  "status" "EditStatus" NOT NULL DEFAULT 'Pending',
  "adminNote" TEXT,
  "configId" TEXT NOT NULL,
  "editorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConfigEdit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConfigEdit_configId_idx" ON "ConfigEdit"("configId");
CREATE INDEX "ConfigEdit_editorId_idx" ON "ConfigEdit"("editorId");
CREATE INDEX "ConfigEdit_status_idx" ON "ConfigEdit"("status");

ALTER TABLE "ConfigEdit"
ADD CONSTRAINT "ConfigEdit_configId_fkey"
FOREIGN KEY ("configId") REFERENCES "Config"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ConfigEdit"
ADD CONSTRAINT "ConfigEdit_editorId_fkey"
FOREIGN KEY ("editorId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

UPDATE "Config"
SET "screenshots" = jsonb_build_array("screenshotUrl")
WHERE "screenshotUrl" IS NOT NULL
  AND ("screenshots" IS NULL OR jsonb_typeof("screenshots") <> 'array');
