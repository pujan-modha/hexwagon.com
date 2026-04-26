import { getIPFromHeaders, isRateLimited } from "~/lib/rate-limiter"
import { db } from "~/services/db"

export const GET = async (req: Request) => {
  const ip = getIPFromHeaders(req.headers)
  if (await isRateLimited(`checkout-status:${ip}`, "checkoutStatusRead")) {
    return Response.json({ ok: false, error: "Too many requests." }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const checkoutReferenceId = searchParams.get("checkoutReferenceId")

  if (!checkoutReferenceId) {
    return Response.json({ ok: false, error: "Missing checkout reference id." }, { status: 400 })
  }

  const ad = await db.ad.findFirst({
    where: { billingCheckoutReferenceId: checkoutReferenceId },
    select: {
      id: true,
      name: true,
      status: true,
    },
  })

  return Response.json({
    ok: true,
    isReady: Boolean(ad),
    ad,
  })
}
