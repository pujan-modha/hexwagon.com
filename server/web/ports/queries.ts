import { performance } from "node:perf_hooks"
import { PortStatus, type Prisma } from "@prisma/client"
import type { SearchSimilarDocumentsParams } from "meilisearch"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import {
  portManyExtendedPayload,
  portManyPayload,
  portOnePayload,
} from "~/server/web/ports/payloads"
import type { FilterSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

const quoteMeiliValues = (values: string[]) =>
  values.map(value => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(", ")

const getPortOrderBy = (sort: string): Prisma.PortFindManyArgs["orderBy"] => {
  if (sort && sort !== "default" && sort.includes(".")) {
    const [sortBy, sortOrder] = sort.split(".") as [string, Prisma.SortOrder]

    if (
      (sortOrder === "asc" || sortOrder === "desc") &&
      [
        "name",
        "score",
        "pageviews",
        "updatedAt",
        "createdAt",
        "publishedAt",
        "isFeatured",
      ].includes(sortBy)
    ) {
      return { [sortBy]: sortOrder } as Prisma.PortFindManyArgs["orderBy"]
    }
  }

  return [{ isFeatured: "desc" }, { score: "desc" }]
}

export const searchPorts = async (search: FilterSchema, where?: Prisma.PortWhereInput) => {
  "use cache"

  cacheTag("ports")
  cacheLife("max")

  const { q, page, sort, perPage, theme, platform, tag } = search
  const start = performance.now()
  const skip = (page - 1) * perPage
  const take = perPage

  const orderBy = getPortOrderBy(sort)

  const whereQuery: Prisma.PortWhereInput = {
    status: PortStatus.Published,
    ...(!!theme.length && { theme: { slug: { in: theme } } }),
    ...(!!platform.length && { platform: { slug: { in: platform } } }),
    ...(!!tag.length && { tags: { some: { slug: { in: tag } } } }),
  }

  if (q) {
    const meiliLimit = sort === "default" ? take : 5000
    const meiliOffset = sort === "default" ? skip : 0

    const meiliFilters = [`status = '${PortStatus.Published}'`]

    if (theme.length) {
      meiliFilters.push(`themeSlug IN [${quoteMeiliValues(theme)}]`)
    }

    if (platform.length) {
      meiliFilters.push(`platformSlug IN [${quoteMeiliValues(platform)}]`)
    }

    if (tag.length) {
      meiliFilters.push(`tags IN [${quoteMeiliValues(tag)}]`)
    }

    const { data, error } = await tryCatch(
      getMeiliIndex("ports").search<{ id: string }>(q, {
        limit: meiliLimit,
        offset: meiliOffset,
        attributesToRetrieve: ["id"],
        filter: meiliFilters,
      }),
    )

    if (!error && data) {
      const ids = Array.from(new Set(data.hits.map(hit => hit.id)))

      if (!ids.length) {
        return { ports: [], totalCount: 0, pageCount: 0 }
      }

      const whereIds: Prisma.PortWhereInput = {
        id: { in: ids },
        status: PortStatus.Published,
        ...(!!theme.length && { theme: { slug: { in: theme } } }),
        ...(!!platform.length && { platform: { slug: { in: platform } } }),
        ...(!!tag.length && { tags: { some: { slug: { in: tag } } } }),
        ...where,
      }

      if (sort === "default") {
        const ports = await db.port.findMany({
          where: whereIds,
          select: portManyPayload,
        })

        const portMap = new Map(ports.map(port => [port.id, port]))
        const orderedPorts = ids
          .map(id => portMap.get(id))
          .filter((port): port is (typeof ports)[number] => Boolean(port))

        const totalCount = data.estimatedTotalHits ?? orderedPorts.length
        const pageCount = Math.ceil(totalCount / perPage)

        console.log(`Ports search: ${Math.round(performance.now() - start)}ms`)
        return { ports: orderedPorts, totalCount, pageCount }
      }

      const ports = await db.port.findMany({
        where: whereIds,
        select: portManyPayload,
        orderBy,
        take,
        skip,
      })

      const totalCount = data.estimatedTotalHits ?? ids.length
      const pageCount = Math.ceil(totalCount / perPage)

      console.log(`Ports search: ${Math.round(performance.now() - start)}ms`)
      return { ports, totalCount, pageCount }
    }
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
  search: Partial<FilterSchema> = {},
) => {
  "use cache"

  cacheTag("ports", `ports-${themeSlug}-${platformSlug}`)
  cacheLife("max")

  const { q = "", sort = "default", perPage = 20 } = search
  const take = perPage

  const orderBy = getPortOrderBy(sort)

  const whereQuery: Prisma.PortWhereInput = {
    status: PortStatus.Published,
    theme: { slug: themeSlug },
    platform: { slug: platformSlug },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  if (q) {
    const meiliLimit = sort === "default" ? Math.max(take * 8, 200) : 5000

    const { data, error } = await tryCatch(
      getMeiliIndex("ports").search<{ id: string }>(q, {
        limit: meiliLimit,
        attributesToRetrieve: ["id"],
        filter: ["status = 'Published'"],
      }),
    )

    if (!error && data) {
      const ids = Array.from(new Set(data.hits.map(hit => hit.id)))

      if (!ids.length) {
        return []
      }

      const whereIds: Prisma.PortWhereInput = {
        id: { in: ids },
        status: PortStatus.Published,
        theme: { slug: themeSlug },
        platform: { slug: platformSlug },
      }

      if (sort === "default") {
        const ports = await db.port.findMany({
          where: whereIds,
          select: portManyPayload,
        })

        const portMap = new Map(ports.map(port => [port.id, port]))
        return ids
          .map(id => portMap.get(id))
          .filter((port): port is (typeof ports)[number] => Boolean(port))
          .slice(0, take)
      }

      return db.port.findMany({
        where: whereIds,
        select: portManyPayload,
        orderBy,
        take,
      })
    }
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

export const findPortRouteParams = async () => {
  "use cache"

  cacheTag("ports")
  cacheLife("max")

  return db.port.findMany({
    where: { status: PortStatus.Published },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      updatedAt: true,
      theme: { select: { slug: true } },
      platform: { select: { slug: true } },
    },
  })
}

export const findThemePlatformRouteParams = async () => {
  "use cache"

  cacheTag("ports")
  cacheLife("max")

  const ports = await db.port.findMany({
    where: { status: PortStatus.Published },
    select: {
      theme: { select: { slug: true } },
      platform: { select: { slug: true } },
    },
  })

  const seen = new Set<string>()
  const params: { themeSlug: string; platformSlug: string }[] = []

  for (const port of ports) {
    const themeSlug = port.theme.slug
    const platformSlug = port.platform.slug
    const key = `${themeSlug}:${platformSlug}`

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    params.push({ themeSlug, platformSlug })
  }

  return params
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
