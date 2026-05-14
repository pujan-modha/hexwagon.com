CREATE TYPE "MissingSuggestionType" AS ENUM ('Theme', 'Platform', 'Port', 'Config');

CREATE TYPE "MissingSuggestionStatus" AS ENUM ('Open', 'Planned', 'Fulfilled', 'Dismissed');

CREATE TYPE "MissingSuggestionLinkStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

CREATE TABLE "MissingSuggestion" (
  "id" TEXT NOT NULL,
  "type" "MissingSuggestionType" NOT NULL,
  "label" TEXT NOT NULL,
  "normalizedLabel" TEXT NOT NULL,
  "themeName" TEXT,
  "normalizedTheme" TEXT NOT NULL DEFAULT '',
  "platformName" TEXT,
  "normalizedPlatform" TEXT NOT NULL DEFAULT '',
  "configName" TEXT,
  "normalizedConfig" TEXT NOT NULL DEFAULT '',
  "status" "MissingSuggestionStatus" NOT NULL DEFAULT 'Open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "themeId" TEXT,
  "platformId" TEXT,

  CONSTRAINT "MissingSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MissingSuggestionVote" (
  "id" TEXT NOT NULL,
  "visitorKeyHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "missingSuggestionId" TEXT NOT NULL,

  CONSTRAINT "MissingSuggestionVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MissingSuggestionLink" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "visitorKeyHash" TEXT NOT NULL,
  "status" "MissingSuggestionLinkStatus" NOT NULL DEFAULT 'Pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "missingSuggestionId" TEXT NOT NULL,

  CONSTRAINT "MissingSuggestionLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissingSuggestion_type_normalizedLabel_normalizedTheme_normalize_key" ON "MissingSuggestion"("type", "normalizedLabel", "normalizedTheme", "normalizedPlatform", "normalizedConfig");
CREATE INDEX "MissingSuggestion_type_idx" ON "MissingSuggestion"("type");
CREATE INDEX "MissingSuggestion_status_idx" ON "MissingSuggestion"("status");
CREATE INDEX "MissingSuggestion_themeId_idx" ON "MissingSuggestion"("themeId");
CREATE INDEX "MissingSuggestion_platformId_idx" ON "MissingSuggestion"("platformId");
CREATE INDEX "MissingSuggestion_updatedAt_idx" ON "MissingSuggestion"("updatedAt");

CREATE UNIQUE INDEX "MissingSuggestionVote_missingSuggestionId_visitorKeyHash_key" ON "MissingSuggestionVote"("missingSuggestionId", "visitorKeyHash");
CREATE INDEX "MissingSuggestionVote_visitorKeyHash_idx" ON "MissingSuggestionVote"("visitorKeyHash");
CREATE INDEX "MissingSuggestionVote_missingSuggestionId_idx" ON "MissingSuggestionVote"("missingSuggestionId");

CREATE INDEX "MissingSuggestionLink_missingSuggestionId_idx" ON "MissingSuggestionLink"("missingSuggestionId");
CREATE INDEX "MissingSuggestionLink_visitorKeyHash_idx" ON "MissingSuggestionLink"("visitorKeyHash");
CREATE INDEX "MissingSuggestionLink_status_idx" ON "MissingSuggestionLink"("status");

ALTER TABLE "MissingSuggestion" ADD CONSTRAINT "MissingSuggestion_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MissingSuggestion" ADD CONSTRAINT "MissingSuggestion_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MissingSuggestionVote" ADD CONSTRAINT "MissingSuggestionVote_missingSuggestionId_fkey" FOREIGN KEY ("missingSuggestionId") REFERENCES "MissingSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissingSuggestionLink" ADD CONSTRAINT "MissingSuggestionLink_missingSuggestionId_fkey" FOREIGN KEY ("missingSuggestionId") REFERENCES "MissingSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
