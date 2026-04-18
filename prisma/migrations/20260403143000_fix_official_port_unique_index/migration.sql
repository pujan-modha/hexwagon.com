-- The previous unique index included isOfficial and blocked multiple non-official ports
-- for the same theme/platform. Keep uniqueness only for official ports.
DROP INDEX IF EXISTS "unique_official_port";

CREATE UNIQUE INDEX "unique_official_port_true"
ON "Port"("themeId", "platformId")
WHERE "isOfficial" = true;
