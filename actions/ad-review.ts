"use server"

import { getUrlHostname } from "@primoui/utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { normalizeImageUrlToS3, uploadFavicon, uploadImageFile } from "~/lib/media"
import { userProcedure } from "~/lib/safe-actions"
import { adDetailsSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"
import { cancelPayPalSubscription } from "~/services/paypal"
import { adStatus } from "~/utils/ads"
import { tryCatch } from "~/utils/helpers"

const resubmitAdForReviewSchema = adDetailsSchema.omit({ email: true }).extend({
  adId: z.string().min(1),
  themeIds: z.array(z.string()).max(50),
  platformIds: z.array(z.string()).max(50),
})

const cancelOwnAdSubscriptionSchema = z.object({
  adId: z.string().min(1),
})

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

export const resubmitAdForReview = userProcedure
  .createServerAction()
  .input(resubmitAdForReviewSchema)
  .handler(async ({ input, ctx: { user } }) => {
    const ownerEmail = user.email.trim().toLowerCase()

    const existingAd = await db.ad.findFirst({
      where: {
        id: input.adId,
        email: {
          equals: ownerEmail,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        status: true,
        targetingTargetCount: true,
        _count: {
          select: {
            targetThemes: true,
            targetPlatforms: true,
          },
        },
      },
    })

    if (!existingAd) {
      throw new Error("Ad not found.")
    }

    if (existingAd.status === adStatus.Rejected) {
      throw new Error("Rejected ads cannot be edited.")
    }

    const maxTargetCount =
      existingAd.targetingTargetCount > 0
        ? existingAd.targetingTargetCount
        : existingAd._count.targetThemes + existingAd._count.targetPlatforms
    const themeIds = Array.from(new Set(input.themeIds))
    const platformIds = Array.from(new Set(input.platformIds))
    const nextTargetCount = themeIds.length + platformIds.length

    if (nextTargetCount > maxTargetCount) {
      throw new Error(
        `You can select up to ${maxTargetCount} target${maxTargetCount === 1 ? "" : "s"} for this campaign.`,
      )
    }

    const { faviconFile, ...details } = input
    const faviconUrl = await resolveAdFaviconUrl({
      websiteUrl: details.websiteUrl,
      faviconUrl: details.faviconUrl,
      faviconFile,
    })

    const ad = await db.ad.update({
      where: { id: existingAd.id },
      data: {
        name: details.name,
        description: details.description,
        websiteUrl: details.websiteUrl,
        buttonLabel: details.buttonLabel || null,
        faviconUrl: faviconUrl ?? null,
        status: adStatus.Pending,
        adminNote: null,
        approvedAt: null,
        rejectedAt: null,
        cancelledAt: null,
        targetThemes: {
          set: themeIds.map(id => ({ id })),
        },
        targetPlatforms: {
          set: platformIds.map(id => ({ id })),
        },
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/ads")
    revalidatePath("/admin/ads")
    revalidateTag("ads", "max")

    return ad
  })

export const cancelOwnAdSubscription = userProcedure
  .createServerAction()
  .input(cancelOwnAdSubscriptionSchema)
  .handler(async ({ input: { adId }, ctx: { user } }) => {
    const ownerEmail = user.email.trim().toLowerCase()

    const existingAd = await db.ad.findFirst({
      where: {
        id: adId,
        email: {
          equals: ownerEmail,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        status: true,
        billingProvider: true,
        billingSubscriptionId: true,
      },
    })

    if (!existingAd) {
      throw new Error("Ad not found.")
    }

    if (!existingAd.billingSubscriptionId || existingAd.billingProvider !== "PayPal") {
      throw new Error("This ad does not have an active PayPal subscription.")
    }

    await cancelPayPalSubscription({
      subscriptionId: existingAd.billingSubscriptionId,
      reason: "Cancelled by advertiser from dashboard.",
    })

    const now = new Date()
    const ad = await db.ad.update({
      where: { id: existingAd.id },
      data: {
        status: adStatus.Cancelled,
        cancelledAt: now,
        approvedAt: null,
        paidAt: null,
        endsAt: now,
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/ads")
    revalidatePath("/admin/ads")
    revalidateTag("ads", "max")

    return ad
  })
