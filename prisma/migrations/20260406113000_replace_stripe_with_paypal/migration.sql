-- Create provider-neutral billing fields and webhook idempotency storage.
CREATE TYPE "BillingProvider" AS ENUM ('Stripe', 'PayPal');

ALTER TABLE "Ad"
ADD COLUMN "billingProvider" "BillingProvider",
ADD COLUMN "billingCheckoutReferenceId" TEXT,
ADD COLUMN "billingSubscriptionId" TEXT,
ADD COLUMN "billingLastPaymentId" TEXT,
ADD COLUMN "billingRefundId" TEXT;

UPDATE "Ad"
SET
  "billingProvider" = CASE
    WHEN "stripeCheckoutSessionId" IS NOT NULL
      OR "stripePaymentIntentId" IS NOT NULL
      OR "stripeChargeId" IS NOT NULL
      OR "subscriptionId" IS NOT NULL
      OR "stripeRefundId" IS NOT NULL
      OR "sessionId" IS NOT NULL
    THEN 'Stripe'::"BillingProvider"
    ELSE NULL
  END,
  "billingCheckoutReferenceId" = COALESCE("stripeCheckoutSessionId", "sessionId"),
  "billingSubscriptionId" = "subscriptionId",
  "billingLastPaymentId" = COALESCE("stripeChargeId", "stripePaymentIntentId"),
  "billingRefundId" = "stripeRefundId";

CREATE TABLE "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ad_billingSubscriptionId_key"
ON "Ad"("billingSubscriptionId");

CREATE INDEX "Ad_billingProvider_billingSubscriptionId_idx"
ON "Ad"("billingProvider", "billingSubscriptionId");

CREATE INDEX "Ad_billingCheckoutReferenceId_idx"
ON "Ad"("billingCheckoutReferenceId");

CREATE INDEX "Ad_billingLastPaymentId_idx"
ON "Ad"("billingLastPaymentId");

CREATE UNIQUE INDEX "BillingWebhookEvent_eventId_key"
ON "BillingWebhookEvent"("eventId");

CREATE INDEX "BillingWebhookEvent_provider_createdAt_idx"
ON "BillingWebhookEvent"("provider", "createdAt");

DROP INDEX IF EXISTS "Ad_stripeCheckoutSessionId_key";
DROP INDEX IF EXISTS "Ad_subscriptionId_key";

ALTER TABLE "Ad"
DROP COLUMN "sessionId",
DROP COLUMN "stripeCheckoutSessionId",
DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "stripeChargeId",
DROP COLUMN "subscriptionId",
DROP COLUMN "stripeRefundId";
