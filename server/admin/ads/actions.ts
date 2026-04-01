"use server";

import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getUrlHostname } from "@primoui/utils";
import { AdType } from "@prisma/client";
import { z } from "zod";
import { adminProcedure } from "~/lib/safe-actions";
import { uploadFavicon } from "~/lib/media";
import { tryCatch } from "~/utils/helpers";
import { db } from "~/services/db";
import { adStatus } from "~/utils/ads";
import {
  notifyAdvertiserOfAdApproved,
  notifyAdvertiserOfAdLive,
  notifyAdvertiserOfAdRejected,
} from "~/lib/notifications";
import { createAdSchema, rejectAdSchema, updateAdSchema } from "./schema";

const adSpotPricingSchema = z.object({
  banner: z.number().positive(),
  listing: z.number().positive(),
  sidebar: z.number().positive(),
  footer: z.number().positive(),
});

const adSettingsSchema = z.object({
  maxDiscountPercentage: z.number().int().min(0).max(100),
});

const adIdSchema = z.object({ id: z.string() });

const resolveAdImageUrl = async ({
  destinationUrl,
  faviconUrl,
}: {
  destinationUrl: string;
  faviconUrl?: string | null;
}) => {
  if (faviconUrl) return faviconUrl;

  const favicon = await tryCatch(
    uploadFavicon(
      getUrlHostname(destinationUrl),
      `ads/${getUrlHostname(destinationUrl)}`,
    ),
  );

  return favicon.data ?? null;
};

export const approveAd = adminProcedure
  .createServerAction()
  .input(adIdSchema)
  .handler(async ({ input: { id } }) => {
    const ad = await db.ad.update({
      where: { id },
      data: {
        status: adStatus.Approved,
        approvedAt: new Date(),
        rejectedAt: null,
        cancelledAt: null,
      },
    });

    revalidatePath("/admin/ads");
    revalidateTag("ads", "max");

    after(async () => {
      if (ad.paidAt) {
        await notifyAdvertiserOfAdLive(ad);
        return;
      }

      await notifyAdvertiserOfAdApproved(ad);
    });

    return ad;
  });

export const rejectAd = adminProcedure
  .createServerAction()
  .input(rejectAdSchema)
  .handler(async ({ input: { adId, reason } }) => {
    const ad = await db.ad.update({
      where: { id: adId },
      data: {
        status: adStatus.Rejected,
        rejectedAt: new Date(),
        approvedAt: null,
        cancelledAt: null,
        adminNote: reason,
      },
    });

    revalidatePath("/admin/ads");
    revalidateTag("ads", "max");

    after(async () => {
      await notifyAdvertiserOfAdRejected(ad);
    });

    return ad;
  });

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
    });

    revalidatePath("/admin/ads");
    revalidateTag("ads", "max");

    return ad;
  });

export const createAd = adminProcedure
  .createServerAction()
  .input(createAdSchema)
  .handler(async ({ input }) => {
    const now = new Date();
    const startsAt = new Date(`${input.startsAt}T00:00:00Z`);
    const endsAt = new Date(`${input.endsAt}T00:00:00Z`);
    const faviconUrl = await resolveAdImageUrl({
      destinationUrl: input.destinationUrl,
      faviconUrl: input.faviconUrl || null,
    });

    const ad = await db.ad.create({
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
      },
    });

    revalidatePath("/admin/ads");
    revalidatePath("/advertise");
    revalidateTag("ads", "max");

    return ad;
  });

export const updateAd = adminProcedure
  .createServerAction()
  .input(updateAdSchema)
  .handler(async ({ input }) => {
    const now = new Date();
    const startsAt = new Date(`${input.startsAt}T00:00:00Z`);
    const endsAt = new Date(`${input.endsAt}T00:00:00Z`);
    const faviconUrl = await resolveAdImageUrl({
      destinationUrl: input.destinationUrl,
      faviconUrl: input.faviconUrl || null,
    });

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
      },
    });

    revalidatePath("/admin/ads");
    revalidatePath("/advertise");
    revalidateTag("ads", "max");

    return ad;
  });

export const updateAdPricing = adminProcedure
  .createServerAction()
  .input(adSpotPricingSchema)
  .handler(async ({ input: { banner, listing, sidebar, footer } }) => {
    const spots: Array<{ spot: AdType; priceCents: number }> = [
      { spot: AdType.Banner, priceCents: Math.round(banner * 100) },
      { spot: AdType.Listing, priceCents: Math.round(listing * 100) },
      { spot: AdType.Sidebar, priceCents: Math.round(sidebar * 100) },
    ];

    const footerSpot = (AdType as Record<string, AdType>).Footer;

    if (footerSpot) {
      spots.push({
        spot: footerSpot,
        priceCents: Math.round(footer * 100),
      });
    }

    for (const { spot, priceCents } of spots) {
      await db.adSpotPricing.upsert({
        where: { spot },
        create: { spot, priceCents },
        update: { priceCents },
      });
    }

    revalidatePath("/admin/ads");
    revalidatePath("/advertise");
    revalidateTag("ad-pricing", "max");

    return spots;
  });

export const updateAdSettings = adminProcedure
  .createServerAction()
  .input(adSettingsSchema)
  .handler(async ({ input: { maxDiscountPercentage } }) => {
    await db.adConfig.upsert({
      where: { id: 1 },
      create: { id: 1, maxDiscountPercentage },
      update: { maxDiscountPercentage },
    });

    revalidatePath("/admin/ads");
    revalidatePath("/advertise");
    revalidateTag("ad-settings", "max");

    return { maxDiscountPercentage };
  });
