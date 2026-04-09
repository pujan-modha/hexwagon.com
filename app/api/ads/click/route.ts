import { revalidateTag } from "next/cache"
import { z } from "zod"
import { db } from "~/services/db"

const adClickSchema = z.object({
  adId: z.string().min(1),
  url: z.string().min(1).max(2048),
  source: z.string().min(1).max(64).optional(),
  type: z.string().min(1).max(64).optional(),
})

export const POST = async (request: Request) => {
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

  revalidateTag("ads", "max")

  return new Response(null, { status: 204 })
}
