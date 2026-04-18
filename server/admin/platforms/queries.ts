import { isTruthy } from "@primoui/utils"
import type { Prisma } from "@prisma/client"
import { endOfDay, startOfDay } from "date-fns"
import { platformManyPayload } from "~/server/web/platforms/payloads"
import { db } from "~/services/db"
import type { PlatformsTableSchema } from "./schema"

const adminPlatformOnePayload = {
  id: true,
  name: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  seoIntro: true,
  seoFaqs: true,
  searchAliases: true,
  websiteUrl: true,
  faviconUrl: true,
  installInstructions: true,
  themeCreationDocs: true,
  license: true,
  isFeatured: true,
  order: true,
  pageviews: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlatformSelect

export const findPlatforms = async (search: PlatformsTableSchema) => {
  const { name, page, perPage, sort, from, to, operator } = search

  const offset = (page - 1) * perPage

  const orderBy: Prisma.PlatformOrderByWithRelationInput[] = sort.map(item => {
    const direction = item.desc ? "desc" : "asc"

    if (item.id === "_count") {
      return { ports: { _count: direction } }
    }

    return { [item.id]: direction } as Prisma.PlatformOrderByWithRelationInput
  })

  const fromDate = from ? startOfDay(new Date(from)) : undefined
  const toDate = to ? endOfDay(new Date(to)) : undefined

  const expressions: (Prisma.PlatformWhereInput | undefined)[] = [
    name ? { name: { contains: name, mode: "insensitive" } } : undefined,
    fromDate || toDate ? { createdAt: { gte: fromDate, lte: toDate } } : undefined,
  ]

  const where: Prisma.PlatformWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [platforms, platformsTotal] = await db.$transaction([
    db.platform.findMany({
      where,
      orderBy,
      take: perPage,
      skip: offset,
      select: platformManyPayload,
    }),

    db.platform.count({
      where,
    }),
  ])

  const pageCount = Math.ceil(platformsTotal / perPage)
  return { platforms, platformsTotal, pageCount }
}

export const findPlatformList = async () => {
  return db.platform.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export const findPlatformBySlug = async (slug: string) => {
  return db.platform.findUnique({
    where: { slug },
    select: adminPlatformOnePayload,
  })
}
