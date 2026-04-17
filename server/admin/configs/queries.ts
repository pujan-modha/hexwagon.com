import { isTruthy } from "@primoui/utils"
import type { Prisma } from "@prisma/client"
import { endOfDay, startOfDay } from "date-fns"
import { configManyPayload } from "~/server/web/configs/payloads"
import { db } from "~/services/db"
import type { ConfigsTableSchema } from "./schema"

const adminConfigOnePayload = {
  id: true,
  name: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  seoFaqs: true,
  searchAliases: true,
  content: true,
  repositoryUrl: true,
  websiteUrl: true,
  screenshotUrl: true,
  faviconUrl: true,
  submitterNote: true,
  license: true,
  isFeatured: true,
  order: true,
  pageviews: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  configThemes: {
    select: {
      themeId: true,
      isPrimary: true,
      order: true,
      theme: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { theme: { name: "asc" } }],
  },
  configPlatforms: {
    select: {
      platformId: true,
      isPrimary: true,
      order: true,
      platform: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { platform: { name: "asc" } }],
  },
} satisfies Prisma.ConfigSelect

export const findConfigs = async (search: ConfigsTableSchema) => {
  const { name, page, perPage, sort, from, to, status, operator } = search
  const offset = (page - 1) * perPage

  const orderBy: Prisma.ConfigOrderByWithRelationInput[] = sort.map(item => {
    const direction = item.desc ? "desc" : "asc"
    const sortKey = String(item.id)

    if (sortKey === "themes") {
      return { configThemes: { _count: direction } }
    }

    if (sortKey === "platforms") {
      return { configPlatforms: { _count: direction } }
    }

    return { [sortKey]: direction } as Prisma.ConfigOrderByWithRelationInput
  })

  const fromDate = from ? startOfDay(new Date(from)) : undefined
  const toDate = to ? endOfDay(new Date(to)) : undefined

  const expressions: (Prisma.ConfigWhereInput | undefined)[] = [
    name ? { name: { contains: name, mode: "insensitive" } } : undefined,
    fromDate || toDate ? { createdAt: { gte: fromDate, lte: toDate } } : undefined,
    status.length > 0 ? { status: { in: status } } : undefined,
  ]

  const where: Prisma.ConfigWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [configs, configsTotal] = await db.$transaction([
    db.config.findMany({
      where,
      orderBy,
      take: perPage,
      skip: offset,
      select: configManyPayload,
    }),
    db.config.count({ where }),
  ])

  const pageCount = Math.ceil(configsTotal / perPage)
  return { configs, configsTotal, pageCount }
}

export const findConfigBySlug = async (slug: string) => {
  return db.config.findUnique({
    where: { slug },
    select: adminConfigOnePayload,
  })
}
