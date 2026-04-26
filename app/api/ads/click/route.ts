import { z } from "zod"
import { getIPFromHeaders, isRateLimited } from "~/lib/rate-limiter"
import { db } from "~/services/db"

const adClickSchema = z.object({
  adId: z.string().min(1),
  url: z.string().min(1).max(2048),
  source: z.string().min(1).max(64).optional(),
  type: z.string().min(1).max(64).optional(),
})

export const POST = async (request: Request) => {
  const ip = getIPFromHeaders(request.headers)
  if (await isRateLimited(`ad-click:${ip}`, "adClickWrite")) {
    return new Response(null, { status: 204 })
  }

  const payload = await request
    .json()
    .then(value => adClickSchema.safeParse(value))
    .catch(() => null)

  if (!payload || !payload.success) {
    return new Response(null, { status: 204 })
  }

  await db.ad.updateMany({
    where: {
      id: payload.data.adId,
      websiteUrl: payload.data.url,
    },
    data: {
      clickCount: {
        increment: 1,
      },
      lastClickedAt: new Date(),
    },
  })

  return new Response(null, { status: 204 })
}
