import { Prisma } from "@prisma/client"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import { adsConfig, type AdSpotType } from "~/config/ads"
import { adManyPayload, adOnePayload } from "~/server/web/ads/payloads"
import type { AdOne } from "~/server/web/ads/payloads"
import { db } from "~/services/db"
import { adStatus } from "~/utils/ads"

const defaultAdPricing = Object.fromEntries(
  adsConfig.adSpots.map(({ type, price }) => [type, price]),
) as Record<AdSpotType, number>

export type AdPricingMap = Record<AdSpotType, number>

export type AdConfigSettings = {
  maxDiscountPercentage: number
  targetingUnitPrice: number
}

const sidebarAdCandidatePayload = Prisma.validator<Prisma.AdSelect>()({
  ...adOnePayload,
  isTargetedSidebar: true,
  targetThemeSlugs: true,
  targetPlatformSlugs: true,
})

type SidebarAdTargeting = {
  themeSlug?: string | null
  platformSlug?: string | null
}

type SidebarAdCandidate = Prisma.AdGetPayload<{ select: typeof sidebarAdCandidatePayload }>

const pickRandom = <T,>(items: T[]): T | null => {
  if (!items.length) return null
  return items[Math.floor(Math.random() * items.length)] ?? null
}

const toAdOne = ({ isTargetedSidebar, targetThemeSlugs, targetPlatformSlugs, ...ad }: SidebarAdCandidate): AdOne => {
  return ad
}

const isSidebarTargetMatch = (
  ad: SidebarAdCandidate,
  { themeSlug, platformSlug }: SidebarAdTargeting,
) => {
  const matchesTheme = themeSlug ? ad.targetThemeSlugs.includes(themeSlug) : false
  const matchesPlatform = platformSlug ? ad.targetPlatformSlugs.includes(platformSlug) : false

  return matchesTheme || matchesPlatform
}

export const findAds = async ({ where, orderBy, ...args }: Prisma.AdFindManyArgs) => {
  "use cache"

  cacheTag("ads")
  cacheLife("hours")

  return db.ad.findMany({
    ...args,
    orderBy: orderBy ?? { startsAt: "desc" },
    where: { status: adStatus.Approved, ...where },
    select: adManyPayload,
  })
}

export const findAd = async ({ where, orderBy, ...args }: Prisma.AdFindFirstArgs) => {
  "use cache"

  cacheTag("ads")
  cacheLife("minutes")

  return db.ad.findFirst({
    ...args,
    orderBy: orderBy ?? { startsAt: "desc" },
    where: {
      startsAt: { lte: new Date() },
      endsAt: { gt: new Date() },
      status: adStatus.Approved,
      ...where,
    },
    select: adOnePayload,
  })
}

export const findSidebarAdForContext = async ({
  where,
  targeting,
}: {
  where?: Prisma.AdWhereInput
  targeting?: SidebarAdTargeting
}): Promise<AdOne | null> => {
  const now = new Date()

  const candidates = await db.ad.findMany({
    where: {
      startsAt: { lte: now },
      endsAt: { gt: now },
      status: adStatus.Approved,
      ...where,
    },
    select: sidebarAdCandidatePayload,
  })

  if (!candidates.length) return null

  const targetedCandidates = candidates.filter(ad => ad.type === "Sidebar" && ad.isTargetedSidebar)
  if (!targetedCandidates.length) {
    const nonTargetedAd = pickRandom(candidates.filter(ad => !ad.isTargetedSidebar))
    return nonTargetedAd ? toAdOne(nonTargetedAd) : null
  }

  const applicableTargetedAds = targeting
    ? targetedCandidates.filter(ad => isSidebarTargetMatch(ad, targeting))
    : []

  if (applicableTargetedAds.length) {
    const targetedAd = pickRandom(applicableTargetedAds)
    return targetedAd ? toAdOne(targetedAd) : null
  }

  const mixedAd = pickRandom(candidates)
  return mixedAd ? toAdOne(mixedAd) : null
}

export const getAdPricing = async (): Promise<AdPricingMap> => {
  "use cache"

  cacheTag("ad-pricing")
  cacheLife("hours")

  const pricing = { ...defaultAdPricing }

  try {
    const rows = await db.adSpotPricing.findMany({
      select: {
        spot: true,
        priceCents: true,
      },
    })

    for (const row of rows) {
      pricing[row.spot as AdSpotType] = row.priceCents / 100
    }
  } catch (error) {
    console.warn("[getAdPricing] falling back to default ad pricing", error)
  }

  return pricing
}

export const getAdSettings = async (): Promise<AdConfigSettings> => {
  "use cache"

  cacheTag("ad-settings")
  cacheLife("hours")

  try {
    const row = await db.adConfig.findUnique({
      where: { id: 1 },
      select: {
        maxDiscountPercentage: true,
        targetingUnitPriceCents: true,
      },
    })

    return {
      maxDiscountPercentage: row?.maxDiscountPercentage ?? 30,
      targetingUnitPrice: (row?.targetingUnitPriceCents ?? 0) / 100,
    }
  } catch (error) {
    console.warn("[getAdSettings] falling back to default ad settings", error)
    return {
      maxDiscountPercentage: 30,
      targetingUnitPrice: 0,
    }
  }
}
