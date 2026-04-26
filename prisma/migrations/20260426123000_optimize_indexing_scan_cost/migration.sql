-- Speed up incremental indexing scans used by cron jobs.
CREATE INDEX IF NOT EXISTS "Theme_updatedAt_idx" ON "Theme" ("updatedAt");
CREATE INDEX IF NOT EXISTS "Platform_updatedAt_idx" ON "Platform" ("updatedAt");
CREATE INDEX IF NOT EXISTS "Port_status_updatedAt_idx" ON "Port" ("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Config_status_updatedAt_idx" ON "Config" ("status", "updatedAt");
