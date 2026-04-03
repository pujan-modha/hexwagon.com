import { PortStatus } from "@prisma/client"
import { platformManyPayload } from "~/server/web/platforms/payloads"
import { portManyPayload } from "~/server/web/ports/payloads"
import { themeManyPayload } from "~/server/web/themes/payloads"
import { db } from "~/services/db"

const DASHBOARD_LIKES_LIMIT = 12

export const findUserLikedEntities = async (userId: string) => {
  const [portLikes, themeLikes, platformLikes] = await db.$transaction([
    db.like.findMany({
      where: {
        userId,
        portId: { not: null },
        port: { is: { status: PortStatus.Published } },
      },
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_LIKES_LIMIT,
      select: {
        port: { select: portManyPayload },
      },
    }),

    db.like.findMany({
      where: {
        userId,
        themeId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_LIKES_LIMIT,
      select: {
        theme: { select: themeManyPayload },
      },
    }),

    db.like.findMany({
      where: {
        userId,
        platformId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_LIKES_LIMIT,
      select: {
        platform: { select: platformManyPayload },
      },
    }),
  ])

  const ports = portLikes
    .map(item => item.port)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  const themes = themeLikes
    .map(item => item.theme)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  const platforms = platformLikes
    .map(item => item.platform)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return { ports, themes, platforms }
}
