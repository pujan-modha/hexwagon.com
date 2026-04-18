ALTER TABLE "Config" ADD COLUMN "authorId" TEXT;
ALTER TABLE "Config" ADD COLUMN "submitterNote" TEXT;

CREATE INDEX "Config_authorId_idx" ON "Config"("authorId");

ALTER TABLE "Config"
ADD CONSTRAINT "Config_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
