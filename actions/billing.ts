"use server"

import { getUrlHostname } from "@primoui/utils"
import { AdBillingCycle } from "@prisma/client"
import { headers } from "next/headers"
import { z } from "zod"
import { createServerAction } from "zsa"
import { env } from "~/env"
import { createAdPackageCheckoutDraft } from "~/lib/ad-package-checkout-draft"
import { createAdPackageDraftToken, verifyAdPackageDraftToken } from "~/lib/ad-package-draft-token"
import { auth } from "~/lib/auth"
import { normalizeImageUrlToS3, uploadFavicon, uploadImageFile } from "~/lib/media"
import { getAdPackagePricing } from "~/server/web/ads/queries"
import { adDetailsSchema } from "~/server/web/shared/schema"
import { createPayPalSubscription, getPayPalPlanId } from "~/services/paypal"
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

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const createAdsCheckout = createServerAction()
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

export const createAdPackageCheckout = createServerAction()
  .input(
    adDetailsSchema.extend({
      draftToken: z.string().min(1),
      themeIds: z.array(z.string()).max(50),
      platformIds: z.array(z.string()).max(50),
    }),
  )
  .handler(
    async ({
      input: {
        draftToken,
        themeIds: inputThemeIds,
        platformIds: inputPlatformIds,
        ...adDetailsInput
      },
    }) => {
      const session = await auth.api.getSession({ headers: await headers() })

      const draft = verifyAdPackageDraftToken(draftToken)

      if (!draft) {
        throw new Error("Invalid or expired package selection.")
      }

      const { faviconFile, ...adDetails } = adDetailsInput
      const ownerEmail = session?.user.email
        ? normalizeEmail(session.user.email)
        : normalizeEmail(adDetails.email)
      const themeIds = Array.from(new Set(inputThemeIds))
      const platformIds = Array.from(new Set(inputPlatformIds))

      const faviconUrl = await resolveAdFaviconUrl({
        websiteUrl: adDetails.websiteUrl,
        faviconUrl: adDetails.faviconUrl,
        faviconFile,
      })

      const pricing = await getAdPackagePricing()
      const cyclePricing =
        draft.billingCycle === AdBillingCycle.Monthly ? pricing.monthly : pricing.weekly

      const targetCount = themeIds.length + platformIds.length
      const targetingTotalPriceCents = cyclePricing.targetUnitPriceCents * targetCount
      const totalAmountCents = cyclePricing.discountedPriceCents + targetingTotalPriceCents

      if (totalAmountCents <= 0) {
        throw new Error("Package amount must be greater than zero.")
      }

      const checkoutPayload = {
        billingCycle: draft.billingCycle,
        themeIds,
        platformIds,
        packageBasePriceCents: cyclePricing.basePriceCents,
        packageDiscountedPriceCents: cyclePricing.discountedPriceCents,
        targetingUnitPriceCents: cyclePricing.targetUnitPriceCents,
        targetingTargetCount: targetCount,
        targetingTotalPriceCents,
        totalAmountCents,
        adDetails: {
          ...adDetails,
          email: ownerEmail,
          faviconUrl,
        },
      }

      const checkoutDraftId = await createAdPackageCheckoutDraft(checkoutPayload)
      const billingCycle = draft.billingCycle === AdBillingCycle.Monthly ? "Monthly" : "Weekly"
      const subscription = await createPayPalSubscription({
        planId: getPayPalPlanId(billingCycle),
        customId: checkoutDraftId,
        amountCents: totalAmountCents,
        subscriberEmail: ownerEmail,
        returnUrl: `${env.NEXT_PUBLIC_SITE_URL}/advertise/success?checkoutReferenceId=${encodeURIComponent(checkoutDraftId)}`,
        cancelUrl: `${env.NEXT_PUBLIC_SITE_URL}/advertise?cancelled=true`,
      })

      return subscription.approveUrl
    },
  )

export const updateAdPackageDraft = createServerAction()
  .input(
    z.object({
      draftToken: z.string(),
      billingCycle: z.nativeEnum(AdBillingCycle),
      themeIds: z.array(z.string()).max(50),
      platformIds: z.array(z.string()).max(50),
    }),
  )
  .handler(async ({ input }) => {
    const parsedDraft = verifyAdPackageDraftToken(input.draftToken)

    if (!parsedDraft) {
      throw new Error("Invalid draft token")
    }

    return createAdPackageDraftToken({
      billingCycle: input.billingCycle,
      themeIds: Array.from(new Set(input.themeIds)),
      platformIds: Array.from(new Set(input.platformIds)),
    })
  })
