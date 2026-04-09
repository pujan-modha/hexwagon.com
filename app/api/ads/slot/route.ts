import type { AdSlot } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { findAllocatedSlotAd } from "~/server/web/ads/queries"

const schema = z.object({
  slot: z.enum(["Listing", "Sidebar"]),
  themeId: z.string().optional(),
  platformId: z.string().optional(),
  excludeAdIds: z.string().optional(),
  scope: z.string().optional(),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsed = schema.safeParse({
    slot: url.searchParams.get("slot"),
    themeId: url.searchParams.get("themeId") ?? undefined,
    platformId: url.searchParams.get("platformId") ?? undefined,
    excludeAdIds: url.searchParams.get("excludeAdIds") ?? undefined,
    scope: url.searchParams.get("scope") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ad slot request" }, { status: 400 })
  }

  const { slot, themeId, platformId, excludeAdIds, scope } = parsed.data
  const ad = await findAllocatedSlotAd({
    slot: slot as AdSlot,
    scope,
    context: {
      themeId,
      platformId,
    },
    excludeAdIds: excludeAdIds
      ? excludeAdIds
          .split(",")
          .map(id => id.trim())
          .filter(Boolean)
      : [],
  })

  return NextResponse.json({ ad })
}
