import { performance } from "node:perf_hooks"
import { type Prisma, PortStatus } from "@prisma/client"
import type { SearchSimilarDocumentsParams } from "meilisearch"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import type { FilterSchema } from "~/server/web/shared/schema"
import {
  portManyExtendedPayload,
  portManyPayload,
  portOnePayload,
} from "~/server/web/ports/payloads"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

export const searchPorts = async (search: FilterSchema, where?: Prisma.PortWhereInput) => {
  "use cache"

  cacheTag("ports")
  cacheLife("max")

  const { q, page, sort, perPage, theme, platform, tag } = search
  const start = performance.now()
  const skip = (page - 1) * perPage
  const take = perPage

  let orderBy: Prisma.PortFindManyArgs["orderBy"] = [{ isFeatured: "desc" }, { score: "desc" }]

  if (sort !== "default") {
    const [sortBy, sortOrder] = sort.split(".") as [keyof typeof orderBy, Prisma.SortOrder]
    orderBy = { [sortBy]: sortOrder }
  }

  const whereQuery: Prisma.PortWhereInput = {
    status: PortStatus.Published,
    ...(!!theme.length && { theme: { slug: { in: theme } } }),
    ...(!!platform.length && { platform: { slug: { in: platform } } }),
    ...(!!tag.length && { tags: { some: { slug: { in: tag } } } }),
  }

  if (q) {
    whereQuery.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]
  }

  const [ports, totalCount] = await db.$transaction([
    db.port.findMany({
      where: { ...whereQuery, ...where },
      select: portManyPayload,
      orderBy,
      take,
      skip,
    }),

    db.port.count({
      where: { ...whereQuery, ...where },
    }),
  ])

  console.log(`Ports search: ${Math.round(performance.now() - start)}ms`)

  const pageCount = Math.ceil(totalCount / perPage)
  return { ports, totalCount, pageCount }
}

export const findPortsByThemeAndPlatform = async (
  themeSlug: string,
  platformSlug: string,
  search: FilterSchema,
) => {
  "use cache"

  cacheTag("ports", `ports-${themeSlug}-${platformSlug}`)
  cacheLife("max")

  const { q, sort, perPage } = search
  const take = perPage ?? 20

  let orderBy: Prisma.PortFindManyArgs["orderBy"] = [
    { isFeatured: "desc" },
    { score: "desc" },
  ]

  if (sort !== "default") {
    const [sortBy, sortOrder] = sort.split(".") as [keyof typeof orderBy, Prisma.SortOrder]
    orderBy = { [sortBy]: sortOrder }
  }

  const whereQuery: Prisma.PortWhereInput = {
    status: PortStatus.Published,
    theme: { slug: themeSlug },
    platform: { slug: platformSlug },
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  }

  return db.port.findMany({
    where: whereQuery,
    select: portManyPayload,
    orderBy,
    take,
  })
}

export const findRelatedPortIds = async ({ id, ...params }: SearchSimilarDocumentsParams) => {
  "use cache"

  cacheTag(`related-port-ids-${id}`)
  cacheLife("hours")

  const { data, error } = await tryCatch(
    getMeiliIndex("ports").searchSimilarDocuments<{ id: string }>({
      id,
      limit: 3,
      embedder: "openAi",
      attributesToRetrieve: ["id"],
      rankingScoreThreshold: 0.7,
      filter: ["status = 'Published'"],
      ...params,
    }),
  )

  if (error) {
    console.error(error)
    return []
  }

  return data.hits.map(hit => hit.id)
}

export const findRelatedPorts = async ({ id, ...params }: SearchSimilarDocumentsParams) => {
  "use cache"

  cacheTag(`related-ports-${id}`)
  cacheLife("hours")

  const ids = await findRelatedPortIds({ id, ...params })

  return await db.port.findMany({
    where: { id: { in: ids } },
    select: portManyPayload,
  })
}

export const findPorts = async ({ where, orderBy, ...args }: Prisma.PortFindManyArgs) => {
  "use cache"

  cacheTag("ports")
  cacheLife("max")

  return db.port.findMany({
    ...args,
    where: { status: PortStatus.Published, ...where },
    orderBy: orderBy ?? [{ isFeatured: "desc" }, { score: "desc" }],
    select: portManyPayload,
  })
}

export const findPortsWithThemeAndPlatform = async ({
  where,
  ...args
}: Prisma.PortFindManyArgs) => {
  "use cache"

  cacheTag("ports")
  cacheLife("max")

  return db.port.findMany({
    ...args,
    where: { status: PortStatus.Published, ...where },
    select: portManyExtendedPayload,
  })
}

export const findPortSlugs = async ({ where, orderBy, ...args }: Prisma.PortFindManyArgs) => {
  "use cache"

  cacheTag("ports")
  cacheLife("max")

  return db.port.findMany({
    ...args,
    orderBy: orderBy ?? { name: "asc" },
    where: { status: PortStatus.Published, ...where },
    select: { slug: true, updatedAt: true },
  })
}

export const countSubmittedPorts = async ({ where, ...args }: Prisma.PortCountArgs) => {
  return db.port.count({
    ...args,
    where: {
      status: { in: [PortStatus.Scheduled, PortStatus.Draft] },
      submitterEmail: { not: null },
      ...where,
    },
  })
}

export const findPort = async ({ where, ...args }: Prisma.PortFindFirstArgs = {}) => {
  "use cache"

  cacheTag("port", `port-${where?.slug}`)
  cacheLife("max")

  return db.port.findFirst({
    ...args,
    where: { ...where },
    select: portOnePayload,
  })
}
