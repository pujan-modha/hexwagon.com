-- Bring migration history in sync with schema for ordering and palette naming fields.
ALTER TABLE "Theme"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Platform"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ColorPalette"
ADD COLUMN "paletteName" TEXT NOT NULL DEFAULT 'Default';
