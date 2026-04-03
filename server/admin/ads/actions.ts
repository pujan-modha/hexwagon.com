"use server"

import { getUrlHostname } from "@primoui/utils"
import { AdType } from "@prisma/client"
import { addDays } from "date-fns"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { env } from "~/env"
import { normalizeImageUrlToS3, uploadFavicon } from "~/lib/media"
import {
  notifyAdvertiserOfAdApproved,
  notifyAdvertiserOfAdLive,
  notifyAdvertiserOfAdRejected,
} from "~/lib/notifications"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"
import { stripe } from "~/services/stripe"
import { adStatus } from "~/utils/ads"
import { tryCatch } from "~/utils/helpers"
import { createAdSchema, rejectAdSchema, updateAdSchema } from "./schema"

const adSpotPricingSchema = z.object({
  banner: z.number().positive(),
  listing: z.number().positive(),
  sidebar: z.number().positive(),
  footer: z.number().positive(),
})

const adSettingsSchema = z.object({
  maxDiscountPercentage: z.number().int().min(0).max(100),
})

const adPackagePricingSchema = z.object({
  weeklyBasePrice: z.number().min(0),
  weeklyDiscountedPrice: z.number().min(0),
  monthlyBasePrice: z.number().min(0),
  monthlyDiscountedPrice: z.number().min(0),
  weeklyTargetUnitPrice: z.number().min(0),
  monthlyTargetUnitPrice: z.number().min(0),
})

const adSlotValues = ["Banner", "Listing", "Sidebar", "Footer"] as const

const adFixedSlotOverrideSchema = z.object({
  slot: z.enum(adSlotValues),
  adId: z.string().min(1).nullable(),
})

const adIdSchema = z.object({ id: z.string() })
const adminAdActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
})

const resolveAdImageUrl = async ({
  destinationUrl,
  faviconUrl,
}: {
  destinationUrl: string
  faviconUrl?: string | null
}) => {
  const websiteHost = getUrlHostname(destinationUrl)
  const providedFaviconUrl = faviconUrl?.trim()

  if (providedFaviconUrl) {
    const normalized = await normalizeImageUrlToS3({
      imageUrl: providedFaviconUrl,
      s3Path: `ads/${websiteHost}/favicon`,
    })

    return normalized
  }

  const favicon = await tryCatch(uploadFavicon(websiteHost, `ads/${websiteHost}`))

  return favicon.data ?? null
}

export const approveAd = adminProcedure
  .createServerAction()
  .input(adIdSchema)
  .handler(async ({ input: { id } }) => {
    const existingAd = await db.ad.findUniqueOrThrow({ where: { id } })

    // Already paid ads can go live immediately after approval.
    if (existingAd.paidAt) {
      const startsAt = new Date()
      const cycleDays = existingAd.billingCycle === "Monthly" ? 30 : 7
      const endsAt = addDays(startsAt, cycleDays)

      const ad = await db.ad.update({
        where: { id },
        data: {
          status: adStatus.Approved,
          approvedAt: new Date(),
          rejectedAt: null,
          cancelledAt: null,
          startsAt,
          endsAt,
        },
      })

      revalidatePath("/admin/ads")
      revalidateTag("ads", "max")

      after(async () => {
        await notifyAdvertiserOfAdLive(ad)
      })

      return ad
    }

    throw new Error("Ad must be paid before approval.")
  })

export const rejectAd = adminProcedure
  .createServerAction()
  .input(rejectAdSchema)
  .handler(async ({ input: { adId, reason } }) => {
    const existingAd = await db.ad.findUniqueOrThrow({ where: { id: adId } })

    let refundId: string | null = null
    let refundAmountCents: number | null = null

    if (existingAd.paidAt && existingAd.stripePaymentIntentId && !existingAd.refundedAt) {
      const refund = await stripe.refunds.create({
        payment_intent: existingAd.stripePaymentIntentId,
      })

      refundId = refund.id
      refundAmountCents = refund.amount
    }

    const ad = await db.ad.update({
      where: { id: adId },
      data: {
        status: adStatus.Rejected,
        rejectedAt: new Date(),
        approvedAt: null,
        cancelledAt: null,
        adminNote: reason,
        refundedAt: refundId ? new Date() : existingAd.refundedAt,
        refundAmountCents: refundAmountCents ?? existingAd.refundAmountCents,
        stripeRefundId: refundId ?? existingAd.stripeRefundId,
      },
    })

    revalidatePath("/admin/ads")
    revalidateTag("ads", "max")

    after(async () => {
      await notifyAdvertiserOfAdRejected(ad)
    })

    return ad
  })

export const cancelAd = adminProcedure
  .createServerAction()
  .input(adIdSchema)
  .handler(async ({ input: { id } }) => {
    const ad = await db.ad.update({
      where: { id },
      data: {
        status: adStatus.Cancelled,
        cancelledAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
      },
    })

    revalidatePath("/admin/ads")
    revalidateTag("ads", "max")

    return ad
  })

export const setAdminAdActive = adminProcedure
  .createServerAction()
  .input(adminAdActiveSchema)
  .handler(async ({ input: { id, isActive } }) => {
    const existingAd = await db.ad.findUniqueOrThrow({ where: { id } })

    const isAdminManaged =
      !existingAd.stripeCheckoutSessionId &&
      !existingAd.stripePaymentIntentId &&
      !existingAd.subscriptionId

    if (!isAdminManaged) {
      throw new Error("Only admin-managed ads can be toggled active/inactive.")
    }

    const now = new Date()

    const ad = await db.ad.update({
      where: { id },
      data: {
        status: isActive ? adStatus.Approved : adStatus.Cancelled,
        approvedAt: isActive ? now : null,
        cancelledAt: isActive ? null : now,
        rejectedAt: null,
        paidAt: existingAd.paidAt ?? now,
      },
    })

    revalidatePath("/admin/ads")
    revalidateTag("ads", "max")

    return ad
  })

export const createAd = adminProcedure
  .createServerAction()
  .input(createAdSchema)
  .handler(async ({ input }) => {
    const now = new Date()
    const startsAt = new Date(`${input.startsAt}T00:00:00Z`)
    const endsAt = new Date(`${input.endsAt}T00:00:00Z`)
    const faviconUrl = await resolveAdImageUrl({
      destinationUrl: input.destinationUrl,
      faviconUrl: input.faviconUrl || null,
    })

    const ad = await db.ad.create({
      data: {
        email: input.email,
        name: input.name,
        description: input.description || null,
        websiteUrl: input.destinationUrl,
        buttonLabel: input.buttonLabel || null,
        faviconUrl,
        type: AdType.All,
        status: input.status,
        startsAt,
        endsAt,
        priceCents: null,
        approvedAt: input.status === adStatus.Approved ? now : null,
        rejectedAt: input.status === adStatus.Rejected ? now : null,
        cancelledAt: input.status === adStatus.Cancelled ? now : null,
        paidAt: now,
        customHtml: input.customHtml || null,
        customCss: input.customCss || null,
        customJs: input.customJs || null,
        targetThemes: input.themeIds.length
          ? {
              connect: input.themeIds.map(id => ({ id })),
            }
          : undefined,
        targetPlatforms: input.platformIds.length
          ? {
              connect: input.platformIds.map(id => ({ id })),
            }
          : undefined,
      },
    })

    revalidatePath("/admin/ads")
    revalidatePath("/advertise")
    revalidateTag("ads", "max")

    return ad
  })

export const updateAd = adminProcedure
  .createServerAction()
  .input(updateAdSchema)
  .handler(async ({ input }) => {
    const now = new Date()
    const startsAt = new Date(`${input.startsAt}T00:00:00Z`)
    const endsAt = new Date(`${input.endsAt}T00:00:00Z`)
    const faviconUrl = await resolveAdImageUrl({
      destinationUrl: input.destinationUrl,
      faviconUrl: input.faviconUrl || null,
    })

    const ad = await db.ad.update({
      where: { id: input.adId },
      data: {
        email: input.email,
        name: input.name,
        description: input.description || null,
        websiteUrl: input.destinationUrl,
        buttonLabel: input.buttonLabel || null,
        faviconUrl,
        type: input.spot,
        status: input.status,
        startsAt,
        endsAt,
        priceCents: input.priceCents,
        approvedAt: input.status === adStatus.Approved ? now : null,
        rejectedAt: input.status === adStatus.Rejected ? now : null,
        cancelledAt: input.status === adStatus.Cancelled ? now : null,
        paidAt: input.markAsPaid ? now : null,
        customHtml: input.customHtml || null,
        customCss: input.customCss || null,
        customJs: input.customJs || null,
        targetThemes: {
          set: input.themeIds.map(id => ({ id })),
        },
        targetPlatforms: {
          set: input.platformIds.map(id => ({ id })),
        },
      },
    })

    revalidatePath("/admin/ads")
    revalidatePath("/advertise")
    revalidateTag("ads", "max")

    return ad
  })

export const updateAdPricing = adminProcedure
  .createServerAction()
  .input(adSpotPricingSchema)
  .handler(async ({ input: { banner, listing, sidebar, footer } }) => {
    const spots: Array<{ spot: AdType; priceCents: number }> = [
      { spot: AdType.Banner, priceCents: Math.round(banner * 100) },
      { spot: AdType.Listing, priceCents: Math.round(listing * 100) },
      { spot: AdType.Sidebar, priceCents: Math.round(sidebar * 100) },
    ]

    const footerSpot = (AdType as Record<string, AdType>).Footer

    if (footerSpot) {
      spots.push({
        spot: footerSpot,
        priceCents: Math.round(footer * 100),
      })
    }

    for (const { spot, priceCents } of spots) {
      await db.adSpotPricing.upsert({
        where: { spot },
        create: { spot, priceCents },
        update: { priceCents },
      })
    }

    revalidatePath("/admin/ads")
    revalidatePath("/advertise")
    revalidateTag("ad-pricing", "max")

    return spots
  })

export const updateAdSettings = adminProcedure
  .createServerAction()
  .input(adSettingsSchema)
  .handler(async ({ input: { maxDiscountPercentage } }) => {
    await db.adConfig.upsert({
      where: { id: 1 },
      create: { id: 1, maxDiscountPercentage },
      update: { maxDiscountPercentage },
    })

    revalidatePath("/admin/ads")
    revalidatePath("/advertise")
    revalidateTag("ad-settings", "max")

    return { maxDiscountPercentage }
  })

export const updateAdPackagePricing = adminProcedure
  .createServerAction()
  .input(adPackagePricingSchema)
  .handler(async ({ input }) => {
    const data = {
      weeklyBasePriceCents: Math.round(input.weeklyBasePrice * 100),
      weeklyDiscountedPriceCents: Math.round(input.weeklyDiscountedPrice * 100),
      monthlyBasePriceCents: Math.round(input.monthlyBasePrice * 100),
      monthlyDiscountedPriceCents: Math.round(input.monthlyDiscountedPrice * 100),
      weeklyTargetUnitPriceCents: Math.round(input.weeklyTargetUnitPrice * 100),
      monthlyTargetUnitPriceCents: Math.round(input.monthlyTargetUnitPrice * 100),
    }

    if (
      data.weeklyDiscountedPriceCents > data.weeklyBasePriceCents ||
      data.monthlyDiscountedPriceCents > data.monthlyBasePriceCents
    ) {
      throw new Error("Discounted package price cannot be higher than base price.")
    }

    await db.adPackageConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    })

    revalidatePath("/admin/ads")
    revalidatePath("/advertise")
    revalidateTag("ad-package-pricing", "max")

    return data
  })

export const setAdFixedSlotOverride = adminProcedure
  .createServerAction()
  .input(adFixedSlotOverrideSchema)
  .handler(async ({ input: { slot, adId } }) => {
    if (adId) {
      const ad = await db.ad.findUnique({
        where: { id: adId },
        select: {
          id: true,
          status: true,
          paidAt: true,
        },
      })

      if (!ad) {
        throw new Error("Ad not found.")
      }

      if (ad.status !== adStatus.Approved || !ad.paidAt) {
        throw new Error("Only paid approved ads can be pinned to a fixed slot.")
      }
    }

    const override = await db.adFixedSlotOverride.upsert({
      where: { slot },
      create: {
        slot,
        adId,
      },
      update: {
        adId,
      },
    })

    revalidatePath("/admin/ads")
    revalidateTag("ads", "max")

    return override
  })
