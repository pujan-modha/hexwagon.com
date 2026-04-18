-- AlterTable
ALTER TABLE "Config" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ConfigPlatform" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ConfigTheme" ALTER COLUMN "updatedAt" DROP DEFAULT;
