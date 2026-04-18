ALTER TABLE "Theme"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoIntro" TEXT,
ADD COLUMN "seoFaqs" TEXT,
ADD COLUMN "searchAliases" TEXT,
ADD COLUMN "seoPlatformOverrides" TEXT;

ALTER TABLE "Platform"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoIntro" TEXT,
ADD COLUMN "seoFaqs" TEXT,
ADD COLUMN "searchAliases" TEXT;

ALTER TABLE "Port"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoFaqs" TEXT,
ADD COLUMN "searchAliases" TEXT;
