import { Prisma } from "@prisma/client";
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";
import { adsConfig, type AdSpotType } from "~/config/ads";
import { adManyPayload, adOnePayload } from "~/server/web/ads/payloads";
import { db } from "~/services/db";
import { adStatus } from "~/utils/ads";

const defaultAdPricing = Object.fromEntries(
  adsConfig.adSpots.map(({ type, price }) => [type, price]),
) as Record<AdSpotType, number>;

export type AdPricingMap = Record<AdSpotType, number>;

export type AdConfigSettings = {
  maxDiscountPercentage: number;
};

const getActiveAdWhere = (where?: Prisma.AdWhereInput): Prisma.AdWhereInput => {
  return {
    startsAt: { lte: new Date() },
    endsAt: { gt: new Date() },
    status: adStatus.Approved,
    ...where,
  };
};

const getWhereWithoutFooterType = (where?: Prisma.AdWhereInput) => {
  const typeFilter = where?.type;

  if (!typeFilter || typeof typeFilter !== "object" || !("in" in typeFilter)) {
    return null;
  }

  const typeIn = typeFilter.in;

  if (!Array.isArray(typeIn) || !typeIn.includes("Footer")) {
    return null;
  }

  const filteredTypes = typeIn.filter((type) => type !== "Footer");

  if (!filteredTypes.length) {
    return null;
  }

  return {
    ...where,
    type: {
      ...typeFilter,
      in: filteredTypes,
    },
  } satisfies Prisma.AdWhereInput;
};

export const findAds = async ({
  where,
  orderBy,
  ...args
}: Prisma.AdFindManyArgs) => {
  "use cache";

  cacheTag("ads");
  cacheLife("hours");

  return db.ad.findMany({
    ...args,
    orderBy: orderBy ?? { startsAt: "desc" },
    where: { status: adStatus.Approved, ...where },
    select: adManyPayload,
  });
};

export const findAd = async ({
  where,
  orderBy,
  ...args
}: Prisma.AdFindFirstArgs) => {
  "use cache";

  cacheTag("ads");
  cacheLife("minutes");

  try {
    return await db.ad.findFirst({
      ...args,
      orderBy: orderBy ?? { startsAt: "desc" },
      where: getActiveAdWhere(where),
      select: adOnePayload,
    });
  } catch (error) {
    const fallbackWhere = getWhereWithoutFooterType(where);
    const isFooterEnumValidationIssue =
      error instanceof Prisma.PrismaClientValidationError &&
      error.message.includes("Invalid value for argument `in`") &&
      error.message.includes("Expected AdType");

    if (!isFooterEnumValidationIssue || !fallbackWhere) {
      throw error;
    }

    return db.ad.findFirst({
      ...args,
      orderBy: orderBy ?? { startsAt: "desc" },
      where: getActiveAdWhere(fallbackWhere),
      select: adOnePayload,
    });
  }
};

export const getAdPricing = async (): Promise<AdPricingMap> => {
  "use cache";

  cacheTag("ad-pricing");
  cacheLife("hours");

  const pricing = { ...defaultAdPricing };

  try {
    const rows = await db.adSpotPricing.findMany({
      select: {
        spot: true,
        priceCents: true,
      },
    });

    for (const row of rows) {
      pricing[row.spot as AdSpotType] = row.priceCents / 100;
    }
  } catch (error) {
    console.warn("[getAdPricing] falling back to default ad pricing", error);
  }

  return pricing;
};

export const getAdSettings = async (): Promise<AdConfigSettings> => {
  "use cache";

  cacheTag("ad-settings");
  cacheLife("hours");

  try {
    const row = await db.adConfig.findUnique({
      where: { id: 1 },
      select: {
        maxDiscountPercentage: true,
      },
    });

    return {
      maxDiscountPercentage: row?.maxDiscountPercentage ?? 30,
    };
  } catch (error) {
    console.warn("[getAdSettings] falling back to default ad settings", error);
    return {
      maxDiscountPercentage: 30,
    };
  }
};
