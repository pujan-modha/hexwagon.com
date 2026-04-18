INSERT INTO "AdSpotPricing" ("spot", "priceCents", "updatedAt")
VALUES ('Footer', 1500, NOW())
ON CONFLICT ("spot") DO NOTHING;
