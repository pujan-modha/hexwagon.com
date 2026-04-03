import { type AdSlot, Prisma } from "@prisma/client";
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";
import { cache } from "react";
import { type AdSpotType, adsConfig } from "~/config/ads";
import {
  type AdOne,
  adManyPayload,
  adOnePayload,
} from "~/server/web/ads/payloads";
import { db } from "~/services/db";
import { adStatus } from "~/utils/ads";

const defaultAdPricing = Object.fromEntries(
  adsConfig.adSpots.map(({ type, price }) => [type, price]),
) as Record<AdSpotType, number>;

const defaultAdPackageConfig = {
  weekly: {
    basePriceCents: Math.round(
      adsConfig.package.pricing.Weekly.basePrice * 100,
    ),
    discountedPriceCents: Math.round(
      adsConfig.package.pricing.Weekly.discountedPrice * 100,
    ),
    targetUnitPriceCents: Math.round(
      adsConfig.package.pricing.Weekly.targetUnitPrice * 100,
    ),
  },
  monthly: {
    basePriceCents: Math.round(
      adsConfig.package.pricing.Monthly.basePrice * 100,
    ),
    discountedPriceCents: Math.round(
      adsConfig.package.pricing.Monthly.discountedPrice * 100,
    ),
    targetUnitPriceCents: Math.round(
      adsConfig.package.pricing.Monthly.targetUnitPrice * 100,
    ),
  },
};

const adAllocationPayload = Prisma.validator<Prisma.AdSelect>()({
  id: true,
  name: true,
  description: true,
  websiteUrl: true,
  buttonLabel: true,
  faviconUrl: true,
  type: true,
  status: true,
  paidAt: true,
  startsAt: true,
  endsAt: true,
  targetThemes: {
    select: { id: true },
  },
  targetPlatforms: {
    select: { id: true },
  },
});

const userAdDashboardPayload = Prisma.validator<Prisma.AdSelect>()({
  id: true,
  name: true,
  email: true,
  websiteUrl: true,
  type: true,
  status: true,
  billingCycle: true,
  startsAt: true,
  endsAt: true,
  priceCents: true,
  paidAt: true,
  approvedAt: true,
  rejectedAt: true,
  cancelledAt: true,
  refundedAt: true,
  adminNote: true,
  stripeCheckoutSessionId: true,
  stripePaymentIntentId: true,
  stripeChargeId: true,
  createdAt: true,
  updatedAt: true,
  targetThemes: {
    select: {
      id: true,
      name: true,
    },
  },
  targetPlatforms: {
    select: {
      id: true,
      name: true,
    },
  },
});

const adSlots: AdSlot[] = ["Banner", "Listing", "Sidebar", "Footer"];

type AdAllocationCandidate = Prisma.AdGetPayload<{
  select: typeof adAllocationPayload;
}>;

export type UserDashboardAd = Prisma.AdGetPayload<{
  select: typeof userAdDashboardPayload;
}>;

export type AdPricingMap = Record<AdSpotType, number>;

export type AdConfigSettings = {
  maxDiscountPercentage: number;
};

export type AdPackagePricingSettings = {
  weekly: {
    basePriceCents: number;
    discountedPriceCents: number;
    targetUnitPriceCents: number;
  };
  monthly: {
    basePriceCents: number;
    discountedPriceCents: number;
    targetUnitPriceCents: number;
  };
};

export type AllocatedAdMap = Record<AdSlot, AdOne | null>;

export type AllocateAdSlotsInput = {
  slots?: AdSlot[];
  context?: {
    themeId?: string;
    platformId?: string;
  };
};

const getActiveAdWhere = (where?: Prisma.AdWhereInput): Prisma.AdWhereInput => {
  return {
    startsAt: { lte: new Date() },
    endsAt: { gt: new Date() },
    status: adStatus.Approved,
    paidAt: { not: null },
    ...where,
  };
};

const isActiveAdCandidate = (candidate: AdAllocationCandidate, now: Date) => {
  return (
    candidate.status === adStatus.Approved &&
    candidate.paidAt !== null &&
    candidate.startsAt <= now &&
    candidate.endsAt > now
  );
};

const toAdOne = (candidate: AdAllocationCandidate): AdOne => {
  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    websiteUrl: candidate.websiteUrl,
    buttonLabel: candidate.buttonLabel,
    faviconUrl: candidate.faviconUrl,
    type: candidate.type,
  };
};

const getWeightedCandidate = (
  candidates: AdAllocationCandidate[],
  context?: AllocateAdSlotsInput["context"],
) => {
  if (!candidates.length) {
    return null;
  }

  const weighted = candidates.map((candidate) => {
    const themeMatch =
      Boolean(context?.themeId) &&
      candidate.targetThemes.some(({ id }) => id === context?.themeId);
    const platformMatch =
      Boolean(context?.platformId) &&
      candidate.targetPlatforms.some(({ id }) => id === context?.platformId);

    return {
      candidate,
      weight: themeMatch || platformMatch ? 2 : 1,
    };
  });

  const totalWeight = weighted.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weighted) {
    random -= item.weight;
    if (random <= 0) {
      return item.candidate;
    }
  }

  return weighted.at(-1)?.candidate ?? null;
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
    where: { status: adStatus.Approved, paidAt: { not: null }, ...where },
    select: adManyPayload,
  });
};

export const findUserAdsByEmail = async (
  email: string,
): Promise<UserDashboardAd[]> => {
  if (!email.trim()) {
    return [];
  }

  return db.ad.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    orderBy: { createdAt: "desc" },
    select: userAdDashboardPayload,
  });
};

export const findAdsForBooking = async () => {
  "use cache";

  cacheTag("ads");
  cacheLife("minutes");

  return db.ad.findMany({
    where: {
      status: adStatus.Approved,
      cancelledAt: null,
      rejectedAt: null,
      endsAt: { gt: new Date() },
    },
    orderBy: { startsAt: "desc" },
    select: adManyPayload,
  });
};

export const findAd = async ({
  where,
  orderBy,
  ...args
}: Prisma.AdFindFirstArgs) => {
  const pinnedOverrides = await db.adFixedSlotOverride.findMany({
    where: {
      adId: { not: null },
    },
    select: {
      adId: true,
    },
  });

  const pinnedAdIds = pinnedOverrides
    .map((override) => override.adId)
    .filter((adId): adId is string => Boolean(adId));

  const mergedWhere = pinnedAdIds.length
    ? {
        AND: [
          where ?? {},
          {
            id: {
              notIn: pinnedAdIds,
            },
          },
        ],
      }
    : where;

  try {
    const candidates = await db.ad.findMany({
      ...args,
      orderBy: orderBy ?? { startsAt: "desc" },
      where: getActiveAdWhere(mergedWhere),
      select: adOnePayload,
      take: 48,
    });

    if (!candidates.length) {
      return null;
    }

    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  } catch (error) {
    const fallbackWhere = getWhereWithoutFooterType(mergedWhere);
    const isFooterEnumValidationIssue =
      error instanceof Prisma.PrismaClientValidationError &&
      error.message.includes("Invalid value for argument `in`") &&
      error.message.includes("Expected AdType");

    if (!isFooterEnumValidationIssue || !fallbackWhere) {
      throw error;
    }

    const candidates = await db.ad.findMany({
      ...args,
      orderBy: orderBy ?? { startsAt: "desc" },
      where: getActiveAdWhere(fallbackWhere),
      select: adOnePayload,
      take: 48,
    });

    if (!candidates.length) {
      return null;
    }

    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }
};

export const allocateAdSlots = async ({
  slots = adSlots,
  context,
}: AllocateAdSlotsInput = {}): Promise<AllocatedAdMap> => {
  const uniqueSlots = Array.from(new Set(slots));
  const now = new Date();
  const allocated = Object.fromEntries(
    adSlots.map((slot) => [slot, null]),
  ) as AllocatedAdMap;
  const usedAdIds = new Set<string>();

  const fixedSlotDelegate = (
    db as unknown as {
      adFixedSlotOverride?: {
        findMany?: (args: Prisma.AdFixedSlotOverrideFindManyArgs) => Promise<
          Array<{
            slot: AdSlot;
            ad: AdAllocationCandidate | null;
          }>
        >;
      };
    }
  ).adFixedSlotOverride;

  const overrides =
    typeof fixedSlotDelegate?.findMany === "function"
      ? await fixedSlotDelegate.findMany({
          where: {
            slot: { in: uniqueSlots },
          },
          select: {
            slot: true,
            ad: {
              select: adAllocationPayload,
            },
          },
        })
      : [];

  for (const override of overrides) {
    if (!override.ad) {
      continue;
    }

    if (!isActiveAdCandidate(override.ad, now)) {
      continue;
    }

    allocated[override.slot] = toAdOne(override.ad);
    usedAdIds.add(override.ad.id);
  }

  const openSlots = uniqueSlots.filter((slot) => allocated[slot] === null);

  if (!openSlots.length) {
    return allocated;
  }

  const candidates = await db.ad.findMany({
    where: getActiveAdWhere(
      usedAdIds.size ? { id: { notIn: Array.from(usedAdIds) } } : undefined,
    ),
    select: adAllocationPayload,
    take: 256,
  });

  const candidatePool = candidates.filter(
    (candidate) => !usedAdIds.has(candidate.id),
  );

  for (const slot of openSlots) {
    const picked = getWeightedCandidate(candidatePool, context);

    if (!picked) {
      allocated[slot] = null;
      continue;
    }

    allocated[slot] = toAdOne(picked);
    usedAdIds.add(picked.id);

    const index = candidatePool.findIndex(({ id }) => id === picked.id);
    if (index !== -1) {
      candidatePool.splice(index, 1);
    }
  }

  return allocated;
};

const getScopedAdAllocation = cache(
  async (scope: string, themeId: string, platformId: string) => {
    void scope;

    return allocateAdSlots({
      slots: adSlots,
      context: {
        themeId: themeId || undefined,
        platformId: platformId || undefined,
      },
    });
  },
);

export const findAllocatedSlotAd = async ({
  slot,
  scope = "default",
  context,
}: {
  slot: AdSlot;
  scope?: string;
  context?: AllocateAdSlotsInput["context"];
}) => {
  const allocated = await getScopedAdAllocation(
    scope,
    context?.themeId ?? "",
    context?.platformId ?? "",
  );

  return allocated[slot];
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

export const getAdPackagePricing =
  async (): Promise<AdPackagePricingSettings> => {
    "use cache";

    cacheTag("ad-package-pricing");
    cacheLife("hours");

    try {
      const row = await db.adPackageConfig.findUnique({
        where: { id: 1 },
        select: {
          weeklyBasePriceCents: true,
          weeklyDiscountedPriceCents: true,
          monthlyBasePriceCents: true,
          monthlyDiscountedPriceCents: true,
          weeklyTargetUnitPriceCents: true,
          monthlyTargetUnitPriceCents: true,
        },
      });

      if (!row) {
        return defaultAdPackageConfig;
      }

      return {
        weekly: {
          basePriceCents: row.weeklyBasePriceCents,
          discountedPriceCents: row.weeklyDiscountedPriceCents,
          targetUnitPriceCents: row.weeklyTargetUnitPriceCents,
        },
        monthly: {
          basePriceCents: row.monthlyBasePriceCents,
          discountedPriceCents: row.monthlyDiscountedPriceCents,
          targetUnitPriceCents: row.monthlyTargetUnitPriceCents,
        },
      };
    } catch (error) {
      console.warn(
        "[getAdPackagePricing] falling back to default package pricing",
        error,
      );

      return defaultAdPackageConfig;
    }
  };
