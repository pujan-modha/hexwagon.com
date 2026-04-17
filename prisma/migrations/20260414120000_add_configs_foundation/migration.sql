CREATE TYPE "ConfigStatus" AS ENUM ('Draft', 'Published');

ALTER TYPE "SuggestionType" ADD VALUE IF NOT EXISTS 'Config';

CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoFaqs" TEXT,
    "searchAliases" TEXT,
    "content" TEXT,
    "repositoryUrl" TEXT,
    "websiteUrl" TEXT,
    "screenshotUrl" TEXT,
    "faviconUrl" TEXT,
    "license" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER DEFAULT 0,
    "status" "ConfigStatus" NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConfigTheme" (
    "configId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigTheme_pkey" PRIMARY KEY ("configId","themeId")
);

CREATE TABLE "ConfigPlatform" (
    "configId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigPlatform_pkey" PRIMARY KEY ("configId","platformId")
);

ALTER TABLE "Report" ADD COLUMN "configId" TEXT;
ALTER TABLE "Like" ADD COLUMN "configId" TEXT;

CREATE UNIQUE INDEX "Config_slug_key" ON "Config"("slug");
CREATE INDEX "Config_slug_idx" ON "Config"("slug");
CREATE INDEX "Config_status_idx" ON "Config"("status");
CREATE INDEX "Config_isFeatured_order_idx" ON "Config"("isFeatured", "order");

CREATE INDEX "ConfigTheme_themeId_idx" ON "ConfigTheme"("themeId");
CREATE INDEX "ConfigTheme_themeId_isPrimary_idx" ON "ConfigTheme"("themeId", "isPrimary");

CREATE INDEX "ConfigPlatform_platformId_idx" ON "ConfigPlatform"("platformId");
CREATE INDEX "ConfigPlatform_platformId_isPrimary_idx" ON "ConfigPlatform"("platformId", "isPrimary");

CREATE INDEX "Report_configId_idx" ON "Report"("configId");

CREATE UNIQUE INDEX "Like_userId_configId_key" ON "Like"("userId", "configId");
CREATE INDEX "Like_configId_idx" ON "Like"("configId");

ALTER TABLE "ConfigTheme" ADD CONSTRAINT "ConfigTheme_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigTheme" ADD CONSTRAINT "ConfigTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConfigPlatform" ADD CONSTRAINT "ConfigPlatform_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigPlatform" ADD CONSTRAINT "ConfigPlatform_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Like" ADD CONSTRAINT "Like_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
