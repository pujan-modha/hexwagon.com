-- Ensure webhook idempotency for package checkouts.
CREATE UNIQUE INDEX IF NOT EXISTS "Ad_stripeCheckoutSessionId_key"
ON "Ad"("stripeCheckoutSessionId");
