import { AdBillingCycle, AdStatus, AdType } from "@prisma/client"
import { addDays } from "date-fns"
import { revalidateTag } from "next/cache"
import type Stripe from "stripe"
import { z } from "zod"
import { env } from "~/env"
import { getAdPackageCheckoutDraft } from "~/lib/ad-package-checkout-draft"
import { notifyAdvertiserOfAdLive, notifyAdvertiserOfAdSubmitted } from "~/lib/notifications"
import { db } from "~/services/db"
import { stripe } from "~/services/stripe"

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

const getCheckoutPaymentRefs = async (session: Stripe.Checkout.Session) => {
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null

  let chargeId: string | null = null

  if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    chargeId = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null
  }

  return { paymentIntentId, chargeId }
}

const handlePaidCheckoutPaymentSession = async (session: Stripe.Checkout.Session) => {
  const adPackageDraftId = session.metadata?.adPackageDraftId

  if (adPackageDraftId) {
    const existingPackageAd = await db.ad.findFirst({
      where: { stripeCheckoutSessionId: session.id },
      select: { id: true },
    })

    if (existingPackageAd) {
      revalidateTag("ads", "max")
      return
    }

    const draftPayload = await getAdPackageCheckoutDraft(adPackageDraftId)

    if (!draftPayload) {
      throw new Error("Missing ad package checkout draft payload.")
    }

    const parsed = adPackageWebhookSchema.parse(draftPayload)
    const { paymentIntentId, chargeId } = await getCheckoutPaymentRefs(session)

    const now = new Date()
    const cycleDays = parsed.billingCycle === AdBillingCycle.Monthly ? 30 : 7

    const createdAd = await db.ad.create({
      data: {
        email: parsed.adDetails.email,
        name: parsed.adDetails.name,
        description: parsed.adDetails.description,
        websiteUrl: parsed.adDetails.websiteUrl,
        buttonLabel: parsed.adDetails.buttonLabel || null,
        faviconUrl: parsed.adDetails.faviconUrl || null,
        type: AdType.All,
        status: AdStatus.Pending,
        startsAt: now,
        endsAt: addDays(now, cycleDays),
        priceCents: parsed.totalAmountCents,
        paidAt: now,
        billingCycle: parsed.billingCycle,
        packageBasePriceCents: parsed.packageBasePriceCents,
        packageDiscountedPriceCents: parsed.packageDiscountedPriceCents,
        targetingUnitPriceCents: parsed.targetingUnitPriceCents,
        targetingTargetCount: parsed.targetingTargetCount,
        targetingTotalPriceCents: parsed.targetingTotalPriceCents,
        stripeCheckoutSessionId: session.id,
        sessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: chargeId,
        targetThemes: {
          connect: parsed.themeIds.map(id => ({ id })),
        },
        targetPlatforms: {
          connect: parsed.platformIds.map(id => ({ id })),
        },
      },
    })

    await notifyAdvertiserOfAdSubmitted(createdAd)
    revalidateTag("ads", "max")

    return
  }

  const adId = session.metadata?.adId

  if (adId) {
    const { count } = await db.ad.updateMany({
      where: {
        id: adId,
        paidAt: null,
        status: AdStatus.Approved,
        cancelledAt: null,
      },
      data: { paidAt: new Date() },
    })

    if (count > 0) {
      const ad = await db.ad.findUnique({ where: { id: adId } })
      if (ad) {
        await notifyAdvertiserOfAdLive(ad)
      }
    }

    revalidateTag("ads", "max")
  }
}

/**
 * Handle the Stripe webhook
 * @param req - The request
 * @returns The response
 */
export const POST = async (req: Request) => {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature") as string
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET
  let event: Stripe.Event

  try {
    if (!signature || !webhookSecret) {
      return new Response("Webhook secret not found.", { status: 400 })
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object

        switch (session.mode) {
          case "payment": {
            if (session.payment_status !== "paid") {
              break
            }

            await handlePaidCheckoutPaymentSession(session)

            break
          }

          case "subscription": {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

            // Handle tool featured listing
            if (subscription.metadata?.tool) {
              await db.port.update({
                where: { slug: subscription.metadata.tool },
                data: { isFeatured: true },
              })

              // Revalidate the cache
              revalidateTag("ports", "max")
            }

            break
          }
        }

        break
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object

        if (session.mode === "payment") {
          await handlePaidCheckoutPaymentSession(session)
        }

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object
        const metadata = subscription.metadata

        // Handle tool featured listing
        if (metadata?.tool) {
          await db.port.update({
            where: { slug: metadata?.tool },
            data: { isFeatured: false },
          })

          // Revalidate the cache
          revalidateTag("ports", "max")
        }

        // TODO: THIS IS NOT WORKING  because the metadata is set on the checkout session, not the subscription
        // Handle alternative ads
        if (metadata?.ads) {
          // Update the ad for the subscription
          await db.ad.update({
            where: { subscriptionId: subscription.id },
            data: { endsAt: new Date(), themes: { set: [] } },
          })

          // Revalidate the cache
          revalidateTag("ads", "max")
          revalidateTag("themes", "max")
        }

        break
      }
    }
  } catch (error) {
    console.log(error)

    return new Response("Webhook handler failed", { status: 400 })
  }

  return new Response(JSON.stringify({ received: true }))
}
