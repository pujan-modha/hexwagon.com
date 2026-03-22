import { NextResponse } from "next/server"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

export const GET = async () => {
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
