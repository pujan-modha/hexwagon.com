import { AdBillingCycle, AdStatus, AdType, BillingProvider, Prisma } from "@prisma/client"
import { addDays } from "date-fns"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { getAdPackageCheckoutDraft } from "~/lib/ad-package-checkout-draft"
import { notifyAdvertiserOfAdSubmitted } from "~/lib/notifications"
import { db } from "~/services/db"
import { showPayPalSubscription, verifyPayPalWebhookSignature } from "~/services/paypal"

const adPackageWebhookSchema = z.object({
  billingCycle: z.nativeEnum(AdBillingCycle),
  themeIds: z.array(z.string()),
  platformIds: z.array(z.string()),
  packageBasePriceCents: z.number().int().nonnegative(),
  packageDiscountedPriceCents: z.number().int().nonnegative(),
  targetingUnitPriceCents: z.number().int().nonnegative(),
  targetingTargetCount: z.number().int().nonnegative(),
  targetingTotalPriceCents: z.number().int().nonnegative(),
  totalAmountCents: z.number().int().positive(),
  adDetails: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    description: z.string().min(1),
    websiteUrl: z.string().url(),
    buttonLabel: z.string().optional(),
    faviconUrl: z.string().url().optional().nullable(),
  }),
})

const paypalWebhookHeadersSchema = z.object({
  authAlgo: z.string().min(1),
  certUrl: z.string().min(1),
  transmissionId: z.string().min(1),
  transmissionSig: z.string().min(1),
  transmissionTime: z.string().min(1),
})

type PayPalWebhookEvent = {
  id: string
  event_type: string
  resource?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const getString = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : null)

const parseAmountCents = (amount: unknown) => {
  if (!isRecord(amount)) {
    return null
  }

  const rawValue = getString(amount.value) ?? getString(amount.total)

  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

const getSubscriptionIdFromResource = (resource?: Record<string, unknown>) =>
  getString(resource?.billing_agreement_id) ??
  getString(resource?.billing_subscription_id) ??
  getString(resource?.id)

const createWebhookEvent = async (tx: Prisma.TransactionClient, event: PayPalWebhookEvent) => {
  await tx.billingWebhookEvent.create({
    data: {
      provider: BillingProvider.PayPal,
      eventId: event.id,
      eventType: event.event_type,
    },
  })
}

const isDuplicateError = (error: unknown) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false
  }

  return error.code === "P2002"
}

const handlePaymentCompleted = async (event: PayPalWebhookEvent) => {
  const resource = isRecord(event.resource) ? event.resource : {}
  const subscriptionId = getSubscriptionIdFromResource(resource)
  const paymentId = getString(resource.id)

  if (!subscriptionId || !paymentId) {
    return
  }

  const subscription = await showPayPalSubscription(subscriptionId)
  const checkoutReferenceId = getString(subscription.custom_id)

  if (!checkoutReferenceId) {
    throw new Error("Missing PayPal custom_id for subscription.")
  }

  const existingAd = await db.ad.findUnique({
    where: { billingSubscriptionId: subscriptionId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      billingCycle: true,
      endsAt: true,
    },
  })

  const checkoutDraft = existingAd ? null : await getAdPackageCheckoutDraft(checkoutReferenceId)

  if (!existingAd && !checkoutDraft) {
    throw new Error("Missing ad package checkout draft payload.")
  }

  const parsedDraft = checkoutDraft ? adPackageWebhookSchema.parse(checkoutDraft) : null
  const now = new Date()

  let createdAdId: string | null = null

  try {
    await db.$transaction(async tx => {
      await createWebhookEvent(tx, event)

      const ad = await tx.ad.findUnique({
        where: { billingSubscriptionId: subscriptionId },
        select: {
          id: true,
          status: true,
          billingCycle: true,
          endsAt: true,
        },
      })

      if (ad) {
        if (ad.status === AdStatus.Rejected || ad.status === AdStatus.Cancelled) {
          return
        }

        const nextEndsAt = addDays(
          ad.endsAt > now ? ad.endsAt : now,
          ad.billingCycle === AdBillingCycle.Monthly ? 30 : 7,
        )

        await tx.ad.update({
          where: { id: ad.id },
          data: {
            paidAt: now,
            endsAt: nextEndsAt,
            billingLastPaymentId: paymentId,
          },
        })

        return
      }

      if (!parsedDraft) {
        throw new Error("Missing checkout draft for first PayPal payment.")
      }

      const cycleDays = parsedDraft.billingCycle === AdBillingCycle.Monthly ? 30 : 7
      const createdAd = await tx.ad.create({
        data: {
          email: parsedDraft.adDetails.email,
          name: parsedDraft.adDetails.name,
          description: parsedDraft.adDetails.description,
          websiteUrl: parsedDraft.adDetails.websiteUrl,
          buttonLabel: parsedDraft.adDetails.buttonLabel || null,
          faviconUrl: parsedDraft.adDetails.faviconUrl || null,
          type: AdType.All,
          status: AdStatus.Pending,
          startsAt: now,
          endsAt: addDays(now, cycleDays),
          priceCents: parsedDraft.totalAmountCents,
          billingProvider: BillingProvider.PayPal,
          billingCheckoutReferenceId: checkoutReferenceId,
          billingSubscriptionId: subscriptionId,
          billingLastPaymentId: paymentId,
          billingCycle: parsedDraft.billingCycle,
          packageBasePriceCents: parsedDraft.packageBasePriceCents,
          packageDiscountedPriceCents: parsedDraft.packageDiscountedPriceCents,
          targetingUnitPriceCents: parsedDraft.targetingUnitPriceCents,
          targetingTargetCount: parsedDraft.targetingTargetCount,
          targetingTotalPriceCents: parsedDraft.targetingTotalPriceCents,
          paidAt: now,
          targetThemes: {
            connect: parsedDraft.themeIds.map(id => ({ id })),
          },
          targetPlatforms: {
            connect: parsedDraft.platformIds.map(id => ({ id })),
          },
        },
      })

      createdAdId = createdAd.id
    })
  } catch (error) {
    if (isDuplicateError(error)) {
      return
    }

    throw error
  }

  if (createdAdId) {
    const createdAd = await db.ad.findUnique({ where: { id: createdAdId } })

    if (createdAd) {
      await notifyAdvertiserOfAdSubmitted(createdAd)
    }
  }

  revalidateTag("ads", "max")
}

const handlePaymentFailed = async (event: PayPalWebhookEvent) => {
  const resource = isRecord(event.resource) ? event.resource : {}
  const subscriptionId = getSubscriptionIdFromResource(resource)

  if (!subscriptionId) {
    return
  }

  try {
    await db.$transaction(async tx => {
      await createWebhookEvent(tx, event)
      await tx.ad.updateMany({
        where: { billingSubscriptionId: subscriptionId },
        data: {
          paidAt: null,
        },
      })
    })
  } catch (error) {
    if (isDuplicateError(error)) {
      return
    }

    throw error
  }

  revalidateTag("ads", "max")
}

const handleSubscriptionClosed = async (event: PayPalWebhookEvent) => {
  const resource = isRecord(event.resource) ? event.resource : {}
  const subscriptionId = getSubscriptionIdFromResource(resource)

  if (!subscriptionId) {
    return
  }

  try {
    await db.$transaction(async tx => {
      await createWebhookEvent(tx, event)
      await tx.ad.updateMany({
        where: { billingSubscriptionId: subscriptionId },
        data: {
          status: AdStatus.Cancelled,
          cancelledAt: new Date(),
          approvedAt: null,
          paidAt: null,
          endsAt: new Date(),
        },
      })
    })
  } catch (error) {
    if (isDuplicateError(error)) {
      return
    }

    throw error
  }

  revalidateTag("ads", "max")
}

const handleRefundCompleted = async (event: PayPalWebhookEvent) => {
  const resource = isRecord(event.resource) ? event.resource : {}
  const refundedPaymentId =
    getString(resource.sale_id) ??
    getString(resource.parent_payment) ??
    getString(resource.capture_id)
  const refundId = getString(resource.id)
  const refundAmountCents =
    parseAmountCents(resource.amount) ?? parseAmountCents(resource.gross_amount)

  if (!refundedPaymentId || !refundId) {
    return
  }

  try {
    await db.$transaction(async tx => {
      await createWebhookEvent(tx, event)
      await tx.ad.updateMany({
        where: { billingLastPaymentId: refundedPaymentId },
        data: {
          billingRefundId: refundId,
          refundedAt: new Date(),
          refundAmountCents,
        },
      })
    })
  } catch (error) {
    if (isDuplicateError(error)) {
      return
    }

    throw error
  }

  revalidateTag("ads", "max")
}

export const POST = async (req: Request) => {
  const body = (await req.json()) as PayPalWebhookEvent

  try {
    const headers = paypalWebhookHeadersSchema.parse({
      authAlgo: req.headers.get("paypal-auth-algo"),
      certUrl: req.headers.get("paypal-cert-url"),
      transmissionId: req.headers.get("paypal-transmission-id"),
      transmissionSig: req.headers.get("paypal-transmission-sig"),
      transmissionTime: req.headers.get("paypal-transmission-time"),
    })
    const isVerified = await verifyPayPalWebhookSignature({ headers, body })

    if (!isVerified) {
      return Response.json(
        { ok: false, error: "Invalid PayPal webhook signature." },
        { status: 400 },
      )
    }

    switch (body.event_type) {
      case "PAYMENT.SALE.COMPLETED":
        await handlePaymentCompleted(body)
        break
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        await handlePaymentFailed(body)
        break
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionClosed(body)
        break
      case "PAYMENT.SALE.REFUNDED":
        await handleRefundCompleted(body)
        break
      default:
        break
    }
  } catch (error) {
    console.error(error)

    return Response.json({ ok: false, error: "Webhook handler failed." }, { status: 400 })
  }

  return Response.json({ received: true })
}
