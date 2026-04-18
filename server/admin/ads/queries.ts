import type { AdSlot } from "@prisma/client"
import { db } from "~/services/db"
import type { AdStatusValue } from "~/utils/ads"
import { adStatus } from "~/utils/ads"
import { type AdAdminMany, adAdminPayload } from "./payloads"

const adStatusFilterValues = [
  adStatus.Pending,
  adStatus.PendingEdit,
  adStatus.Approved,
  adStatus.Rejected,
  adStatus.Cancelled,
] as const

export type AdStatusFilterValue = (typeof adStatusFilterValues)[number] | "All"

export type AdStatusCounts = Record<AdStatusFilterValue, number>

export const findAds = async ({
  status,
}: { status?: AdStatusValue | "All" } = {}): Promise<AdAdminMany[]> => {
  return db.ad.findMany({
    where: status && status !== "All" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: adAdminPayload,
  })
}

export const findAdStatusCounts = async (): Promise<AdStatusCounts> => {
  const grouped = await db.ad.groupBy({
    by: ["status"],
    _count: { _all: true },
  })

  const counts: AdStatusCounts = {
    All: 0,
    Pending: 0,
    PendingEdit: 0,
    Approved: 0,
    Rejected: 0,
    Cancelled: 0,
  }

  for (const row of grouped) {
    counts[row.status] = row._count._all
    counts.All += row._count._all
  }

  return counts
}

export const findFixedSlotOverrides = async () => {
  const rows = await db.adFixedSlotOverride.findMany({
    orderBy: { slot: "asc" },
    select: {
      slot: true,
      adId: true,
      ad: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const map: Record<AdSlot, { adId: string | null; adName: string | null }> = {
    Banner: { adId: null, adName: null },
    Listing: { adId: null, adName: null },
    Sidebar: { adId: null, adName: null },
    Footer: { adId: null, adName: null },
  }

  for (const row of rows) {
    map[row.slot] = {
      adId: row.adId,
      adName: row.ad?.name ?? null,
    }
  }

  return map
}

export const findFixedSlotCandidates = async () => {
  return db.ad.findMany({
    where: {
      status: "Approved",
      paidAt: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      endsAt: true,
    },
    take: 200,
  })
}
