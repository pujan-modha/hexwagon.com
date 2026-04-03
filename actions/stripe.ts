"use server"

import { getUrlHostname } from "@primoui/utils"
import { AdBillingCycle, AdType, type Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { createServerAction } from "zsa"
import { env } from "~/env"
import { verifyAdCheckoutSessionToken } from "~/lib/ad-checkout-session-token"
import { consumeAdDraftToken, createAdDraftToken } from "~/lib/ad-draft-token"
import { createAdPackageCheckoutDraft } from "~/lib/ad-package-checkout-draft"
import { createAdPackageDraftToken, verifyAdPackageDraftToken } from "~/lib/ad-package-draft-token"
import { normalizeImageUrlToS3, uploadFavicon, uploadImageFile } from "~/lib/media"
import { notifyAdvertiserOfAdSubmitted } from "~/lib/notifications"
import { getAdPackagePricing, getAdPricing, getAdSettings } from "~/server/web/ads/queries"
import { adDetailsSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"
import { stripe } from "~/services/stripe"
import { adStatus, calculateAdsPrice } from "~/utils/ads"
import { tryCatch } from "~/utils/helpers"

const resolveAdFaviconUrl = async ({
  websiteUrl,
  faviconUrl,
  faviconFile,
}: {
  websiteUrl: string
  faviconUrl?: string
  faviconFile?: File
}) => {
  const websiteHost = getUrlHostname(websiteUrl)

  if (faviconFile) {
    return uploadImageFile({
      file: faviconFile,
      s3Path: `ads/${websiteHost}/favicon-upload`,
    })
  }

  const providedFaviconUrl = faviconUrl?.trim()
  if (providedFaviconUrl) {
    return normalizeImageUrlToS3({
      imageUrl: providedFaviconUrl,
      s3Path: `ads/${websiteHost}/favicon`,
    })
  }

  return (await tryCatch(uploadFavicon(websiteHost, `ads/${websiteHost}`))).data
}

export const createStripeAdsCheckout = createServerAction()
  .input(
    z.object({
      billingCycle: z.nativeEnum(AdBillingCycle),
      themeIds: z.array(z.string()).max(50),
      platformIds: z.array(z.string()).max(50),
    }),
  )
  .handler(async ({ input }) => {
    const themeIds = Array.from(new Set(input.themeIds))
    const platformIds = Array.from(new Set(input.platformIds))

    const draftToken = createAdPackageDraftToken({
      billingCycle: input.billingCycle,
      themeIds,
      platformIds,
    })

    return `${env.NEXT_PUBLIC_SITE_URL}/advertise/success?draft=${encodeURIComponent(draftToken)}`
  })

export const createStripeAdPackageCheckout = createServerAction()
  .input(
    adDetailsSchema.extend({
      draftToken: z.string().min(1),
    }),
  )
  .handler(async ({ input: { draftToken, ...adDetailsInput } }) => {
    const draft = verifyAdPackageDraftToken(draftToken)

    if (!draft) {
      throw new Error("Invalid or expired package selection.")
    }

    const { faviconFile, ...adDetails } = adDetailsInput
    const faviconUrl = await resolveAdFaviconUrl({
      websiteUrl: adDetails.websiteUrl,
      faviconUrl: adDetails.faviconUrl,
      faviconFile,
    })

    const pricing = await getAdPackagePricing()
    const cyclePricing =
      draft.billingCycle === AdBillingCycle.Monthly ? pricing.monthly : pricing.weekly

    const targetCount = draft.themeIds.length + draft.platformIds.length
    const targetingTotalPriceCents = cyclePricing.targetUnitPriceCents * targetCount
    const totalAmountCents = cyclePricing.discountedPriceCents + targetingTotalPriceCents

    if (totalAmountCents <= 0) {
      throw new Error("Package amount must be greater than zero.")
    }

    const checkoutPayload = {
      billingCycle: draft.billingCycle,
      themeIds: draft.themeIds,
      platformIds: draft.platformIds,
      packageBasePriceCents: cyclePricing.basePriceCents,
      packageDiscountedPriceCents: cyclePricing.discountedPriceCents,
      targetingUnitPriceCents: cyclePricing.targetUnitPriceCents,
      targetingTargetCount: targetCount,
      targetingTotalPriceCents,
      totalAmountCents,
      adDetails: {
        ...adDetails,
        faviconUrl,
      },
    }

    const checkoutDraftId = await createAdPackageCheckoutDraft(checkoutPayload)

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            product_data: {
              name: `Ad Package (${draft.billingCycle.toLowerCase()})`,
              description: `${targetCount} targeting selection${targetCount === 1 ? "" : "s"}`,
            },
            unit_amount: totalAmountCents,
            currency: "usd",
          },
          quantity: 1,
        },
      ],
      metadata: {
        adPackageDraftId: checkoutDraftId,
      },
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      success_url: `${env.NEXT_PUBLIC_SITE_URL}/advertise/success?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/advertise?cancelled=true`,
    })

    if (!checkout.url) {
      throw new Error("Unable to create a new Stripe Checkout Session.")
    }

    return checkout.url
  })

export const createStripeThemeAdsCheckout = createServerAction()
  .input(
    z.object({
      type: z.nativeEnum(AdType),
      themes: z.array(z.object({ slug: z.string(), name: z.string() })),
    }),
  )
  .handler(async ({ input: { type, themes } }) => {
    const adData = [{ type, themes: themes.map(({ slug }) => slug) }]

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: themes.map(({ name }) => ({
        price_data: {
          product_data: { name },
          unit_amount: 9900, // $99/month default
          currency: "usd",
          recurring: { interval: "month" },
        },
        quantity: 1,
      })),
      subscription_data: { metadata: { ads: JSON.stringify(adData) } },
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      success_url: `${env.NEXT_PUBLIC_SITE_URL}/advertise/success?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/advertise/themes?cancelled=true`,
    })

    if (!checkout.url) {
      throw new Error("Unable to create a new Stripe Checkout Session.")
    }

    // Return the checkout session url
    return checkout.url
  })

export const createAdFromCheckout = createServerAction()
  .input(
    adDetailsSchema.extend({
      sessionId: z.string(),
      sessionToken: z.string().min(1),
    }),
  )
  .handler(async ({ input: { sessionId, sessionToken, ...adDetailsInput } }) => {
    const { faviconFile, ...adDetails } = adDetailsInput

    if (!verifyAdCheckoutSessionToken({ sessionId, token: sessionToken })) {
      throw new Error("Invalid or expired ad setup session")
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const email = session.customer_details?.email ?? adDetails.email
    const ads: Omit<Omit<Prisma.AdCreateInput, "email">, keyof typeof adDetails>[] = []

    if (session.status !== "complete") {
      throw new Error("Checkout session is not complete")
    }

    const faviconUrl = await resolveAdFaviconUrl({
      websiteUrl: adDetails.websiteUrl,
      faviconUrl: adDetails.faviconUrl,
      faviconFile,
    })

    // Check if ads already exist for specific sessionId
    const existingAds = await db.ad.findMany({
      where: { sessionId },
    })

    // If ads already exist, update them
    if (existingAds.length) {
      await db.ad.updateMany({
        where: { sessionId },
        data: {
          name: adDetails.name,
          description: adDetails.description,
          websiteUrl: adDetails.websiteUrl,
          buttonLabel: adDetails.buttonLabel || null,
          email,
          faviconUrl,
          status: adStatus.Pending,
          paidAt: new Date(),
        },
      })

      // Revalidate the cache
      revalidateTag("ads", "max")
      revalidateTag("alternatives", "max")

      return { success: true }
    }

    switch (session.mode) {
      // Handle one-time payment ads
      case "payment": {
        if (!session.metadata?.ads) {
          throw new Error("Invalid session for ad creation")
        }

        const adsSchema = z.array(
          z.object({
            type: z.nativeEnum(AdType),
            startsAt: z.coerce.number().transform(date => new Date(date)),
            endsAt: z.coerce.number().transform(date => new Date(date)),
            priceCents: z.coerce.number().int().nonnegative().optional(),
          }),
        )

        // Parse the ads from the session metadata
        const parsedAds = adsSchema.parse(JSON.parse(session.metadata.ads))

        // Add ads to create later
        ads.push(...parsedAds)

        break
      }

      // Handle subscription-based ads
      case "subscription": {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        if (!subscription.metadata?.ads) {
          throw new Error("Invalid session for ad creation")
        }

        const adsSchema = z.array(
          z.object({
            type: z.nativeEnum(AdType),
            alternatives: z.array(z.string()),
          }),
        )

        // Parse the ads from the session metadata
        const parsedAds = adsSchema.parse(JSON.parse(subscription.metadata.ads))

        // Add ads to create later
        ads.push(
          ...parsedAds.map(({ type, alternatives }) => ({
            type,
            subscriptionId: subscription.id,
            startsAt: new Date(),
            endsAt: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
            alternatives: { connect: alternatives.map(slug => ({ slug })) },
          })),
        )

        break
      }

      default: {
        throw new Error("Invalid session for ad creation")
      }
    }

    // Create ads in a transaction
    const createdAds = await db.$transaction(
      ads.map(ad =>
        db.ad.create({
          data: {
            ...ad,
            ...adDetails,
            email,
            faviconUrl,
            sessionId,
            priceCents: ad.priceCents,
            paidAt: new Date(),
            status: adStatus.Pending,
          },
        }),
      ),
    )

    // Revalidate the cache
    revalidateTag("ads", "max")
    revalidateTag("alternatives", "max")

    after(async () => {
      await Promise.all(
        createdAds
          .filter(ad => ad.email)
          .map(async ad => {
            await notifyAdvertiserOfAdSubmitted(ad)
          }),
      )
    })

    return { success: true }
  })

export const createAdFromDraft = createServerAction()
  .input(
    adDetailsSchema.extend({
      draftToken: z.string().min(1),
    }),
  )
  .handler(async ({ input: { draftToken, ...adDetailsInput } }) => {
    const { faviconFile, ...adDetails } = adDetailsInput

    const draft = await consumeAdDraftToken(draftToken)

    if (!draft) {
      throw new Error("Invalid, expired, or already used booking session")
    }

    const faviconUrl = await resolveAdFaviconUrl({
      websiteUrl: adDetails.websiteUrl,
      faviconUrl: adDetails.faviconUrl,
      faviconFile,
    })

    const createdAds = await db.$transaction(
      draft.ads.map(ad =>
        db.ad.create({
          data: {
            email: adDetails.email,
            name: adDetails.name,
            description: adDetails.description,
            websiteUrl: adDetails.websiteUrl,
            buttonLabel: adDetails.buttonLabel || null,
            faviconUrl,
            type: ad.type,
            startsAt: new Date(ad.startsAt),
            endsAt: new Date(ad.endsAt),
            priceCents: ad.priceCents,
            status: adStatus.Pending,
          },
        }),
      ),
    )

    revalidateTag("ads", "max")

    after(async () => {
      await Promise.all(
        createdAds
          .filter(ad => ad.email)
          .map(async ad => {
            await notifyAdvertiserOfAdSubmitted(ad)
          }),
      )
    })

    return { success: true }
  })

export const updateAdPackageDraft = createServerAction()
  .input(
    z.object({
      draftToken: z.string(),
      billingCycle: z.nativeEnum(AdBillingCycle),
    }),
  )
  .handler(async ({ input }) => {
    const parsedDraft = verifyAdPackageDraftToken(input.draftToken)

    if (!parsedDraft) {
      throw new Error("Invalid draft token")
    }

    return createAdPackageDraftToken({
      billingCycle: input.billingCycle,
      themeIds: parsedDraft.themeIds,
      platformIds: parsedDraft.platformIds,
    })
  })
