"use server";

import { getUrlHostname } from "@primoui/utils";
import { AdType, type Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createServerAction } from "zsa";
import { env } from "~/env";
import { uploadFavicon } from "~/lib/media";
import { adDetailsSchema } from "~/server/web/shared/schema";
import { getAdPricing, getAdSettings } from "~/server/web/ads/queries";
import { db } from "~/services/db";
import { stripe } from "~/services/stripe";
import { adStatus, calculateAdsPrice } from "~/utils/ads";
import { tryCatch } from "~/utils/helpers";

export const createStripeAdsCheckout = createServerAction()
  .input(
    z.array(
      z.object({
        type: z.enum([AdType.Banner, AdType.Listing, AdType.Sidebar, AdType.Footer]),
        duration: z.coerce.number(),
        metadata: z.object({
          startDate: z.coerce.number(),
          endDate: z.coerce.number(),
        }),
      }),
    ),
  )
  .handler(async ({ input: ads }) => {
    const [pricing, settings] = await Promise.all([
      getAdPricing(),
      getAdSettings(),
    ]);

    const basePrice = Math.min(...Object.values(pricing));
    const pricingSummary = calculateAdsPrice(
      ads.map(({ type, duration }) => ({
        price: pricing[type],
        duration,
      })),
      basePrice,
      settings.maxDiscountPercentage,
    );

    const discountedMultiplier = 1 - pricingSummary.discountPercentage / 100;
    const adData = ads.map(({ type, duration, metadata }) => {
      const unitAmountCents = Math.round(
        pricing[type] * discountedMultiplier * 100,
      );

      return {
        type,
        startsAt: metadata.startDate,
        endsAt: metadata.endDate,
        priceCents: unitAmountCents * duration,
      };
    });

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "if_required",
      line_items: [
        ...ads.map(({ type, duration }) => ({
          price_data: {
            product_data: { name: `${type} Ad` },
            unit_amount: Math.round(pricing[type] * discountedMultiplier * 100),
            currency: "usd",
          },
          quantity: duration,
        })),
      ],
      metadata: { ads: JSON.stringify(adData) },
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      invoice_creation: { enabled: true },
      success_url: `${env.NEXT_PUBLIC_SITE_URL}/advertise/success?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/advertise?cancelled=true`,
    });

    if (!checkout.url) {
      throw new Error("Unable to create a new Stripe Checkout Session.");
    }

    // Return the checkout session url
    return checkout.url;
  });

export const createStripeThemeAdsCheckout = createServerAction()
  .input(
    z.object({
      type: z.nativeEnum(AdType),
      themes: z.array(z.object({ slug: z.string(), name: z.string() })),
    }),
  )
  .handler(async ({ input: { type, themes } }) => {
    const adData = [{ type, themes: themes.map(({ slug }) => slug) }];

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
    });

    if (!checkout.url) {
      throw new Error("Unable to create a new Stripe Checkout Session.");
    }

    // Return the checkout session url
    return checkout.url;
  });

export const createAdFromCheckout = createServerAction()
  .input(
    adDetailsSchema.extend({
      sessionId: z.string(),
    }),
  )
  .handler(async ({ input: { sessionId, ...adDetails } }) => {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_details?.email ?? "";
    const ads: Omit<
      Omit<Prisma.AdCreateInput, "email">,
      keyof typeof adDetails
    >[] = [];

    if (session.status !== "complete") {
      throw new Error("Checkout session is not complete");
    }

    // Upload favicon
    const websiteUrl = getUrlHostname(adDetails.websiteUrl);
    const { data: faviconUrl } = await tryCatch(
      uploadFavicon(websiteUrl, `ads/${websiteUrl}`),
    );

    // Check if ads already exist for specific sessionId
    const existingAds = await db.ad.findMany({
      where: { sessionId },
    });

    // If ads already exist, update them
    if (existingAds.length) {
      await db.ad.updateMany({
        where: { sessionId },
        data: {
          ...adDetails,
          faviconUrl,
          status: adStatus.Pending,
          paidAt: new Date(),
        },
      });

      // Revalidate the cache
      revalidateTag("ads", "max");
      revalidateTag("alternatives", "max");

      return { success: true };
    }

    switch (session.mode) {
      // Handle one-time payment ads
      case "payment": {
        if (!session.metadata?.ads) {
          throw new Error("Invalid session for ad creation");
        }

        const adsSchema = z.array(
          z.object({
            type: z.nativeEnum(AdType),
            startsAt: z.coerce.number().transform((date) => new Date(date)),
            endsAt: z.coerce.number().transform((date) => new Date(date)),
            priceCents: z.coerce.number().int().nonnegative().optional(),
          }),
        );

        // Parse the ads from the session metadata
        const parsedAds = adsSchema.parse(JSON.parse(session.metadata.ads));

        // Add ads to create later
        ads.push(...parsedAds);

        break;
      }

      // Handle subscription-based ads
      case "subscription": {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        if (!subscription.metadata?.ads) {
          throw new Error("Invalid session for ad creation");
        }

        const adsSchema = z.array(
          z.object({
            type: z.nativeEnum(AdType),
            alternatives: z.array(z.string()),
          }),
        );

        // Parse the ads from the session metadata
        const parsedAds = adsSchema.parse(
          JSON.parse(subscription.metadata.ads),
        );

        // Add ads to create later
        ads.push(
          ...parsedAds.map(({ type, alternatives }) => ({
            type,
            subscriptionId: subscription.id,
            startsAt: new Date(),
            endsAt: new Date(
              new Date().setFullYear(new Date().getFullYear() + 10),
            ),
            alternatives: { connect: alternatives.map((slug) => ({ slug })) },
          })),
        );

        break;
      }

      default: {
        throw new Error("Invalid session for ad creation");
      }
    }

    // Create ads in a transaction
    await db.$transaction(
      ads.map((ad) =>
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
    );

    // Revalidate the cache
    revalidateTag("ads", "max");
    revalidateTag("alternatives", "max");

    return { success: true };
  });
