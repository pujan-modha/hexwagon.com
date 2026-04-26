import { NextResponse } from "next/server"
import { env } from "~/env"
import { getIPFromHeaders, isRateLimited } from "~/lib/rate-limiter"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

export const GET = async (request: Request) => {
  const ip = getIPFromHeaders(request.headers)
  if (await isRateLimited(`health:${ip}`, "healthRead")) {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString(), error: "Too many requests." },
      { status: 429 },
    )
  }

  const providedSecret = request.headers.get("x-healthcheck-secret")
  const hasValidSecret =
    Boolean(env.HEALTHCHECK_SECRET) && providedSecret === env.HEALTHCHECK_SECRET

  if (!hasValidSecret) {
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      db: "skipped",
    })
  }

  const { error } = await tryCatch(db.$queryRaw`SELECT 1`)

  if (error) {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString(), db: "unreachable" },
      { status: 503 },
    )
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: "ok",
  })
}
