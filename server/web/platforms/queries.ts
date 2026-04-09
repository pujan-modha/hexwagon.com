import { performance } from "node:perf_hooks"
import { PortStatus, type Prisma } from "@prisma/client"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import { platformManyPayload, platformOnePayload } from "~/server/web/platforms/payloads"
import type { PlatformMany } from "~/server/web/platforms/payloads"
import type { FilterSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

const getPlatformOrderBy = (sort: string): Prisma.PlatformFindManyArgs["orderBy"] => {
  if (sort && sort !== "default" && sort.includes(".")) {
    const [sortBy, sortOrder] = sort.split(".") as [string, Prisma.SortOrder]

    if (sortOrder === "asc" || sortOrder === "desc") {
      if (sortBy === "likes") {
        return { likes: { _count: sortOrder } }
      }

      if (["name", "createdAt", "updatedAt", "order"].includes(sortBy)) {
        return { [sortBy]: sortOrder } as Prisma.PlatformFindManyArgs["orderBy"]
      }
    }
  }

  return [{ likes: { _count: "desc" } }, { order: "asc" }, { name: "asc" }]
}

export const searchPlatforms = async (search: FilterSchema, where?: Prisma.PlatformWhereInput) => {
  "use cache"

  cacheTag("platforms")
  cacheLife("max")

  const { q, page, sort, perPage } = search
  const start = performance.now()
  const skip = (page - 1) * perPage
  const take = perPage

  const orderBy = getPlatformOrderBy(sort)

  if (q) {
    const meiliLimit = sort === "default" ? take : 5000
    const meiliOffset = sort === "default" ? skip : 0

    const { data, error } = await tryCatch(
      getMeiliIndex("platforms").search<{ id: string }>(q, {
        limit: meiliLimit,
        offset: meiliOffset,
        attributesToRetrieve: ["id"],
      }),
    )

    if (!error && data) {
      const ids = Array.from(new Set(data.hits.map(hit => hit.id)))

      if (!ids.length) {
        return { platforms: [], totalCount: 0, pageCount: 0 }
      }

      const whereIds: Prisma.PlatformWhereInput = {
        id: { in: ids },
        ...where,
      }

      if (sort === "default") {
        const platforms = await db.platform.findMany({
          where: whereIds,
          select: platformManyPayload,
        })

        const platformMap = new Map(platforms.map(platform => [platform.id, platform]))
        const orderedPlatforms = ids
          .map(id => platformMap.get(id))
          .filter((platform): platform is PlatformMany => Boolean(platform))

        const totalCount = data.estimatedTotalHits ?? orderedPlatforms.length
        const pageCount = Math.ceil(totalCount / perPage)

        console.log(`Platforms search: ${Math.round(performance.now() - start)}ms`)
        return { platforms: orderedPlatforms, totalCount, pageCount }
      }

      const platforms = await db.platform.findMany({
        where: whereIds,
        select: platformManyPayload,
        orderBy,
        take,
        skip,
      })

      const totalCount = data.estimatedTotalHits ?? ids.length
      const pageCount = Math.ceil(totalCount / perPage)

      console.log(`Platforms search: ${Math.round(performance.now() - start)}ms`)
      return { platforms, totalCount, pageCount }
    }
  }

  const whereQuery: Prisma.PlatformWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [platforms, totalCount] = await db.$transaction([
    db.platform.findMany({
      where: { ...whereQuery, ...where },
      select: platformManyPayload,
      orderBy,
      take,
      skip,
    }),

    db.platform.count({
      where: { ...whereQuery, ...where },
    }),
  ])

  console.log(`Platforms search: ${Math.round(performance.now() - start)}ms`)

  const pageCount = Math.ceil(totalCount / perPage)
  return { platforms, totalCount, pageCount }
}

export const findPlatforms = async ({ where, orderBy, ...args }: Prisma.PlatformFindManyArgs) => {
  "use cache"

  cacheTag("platforms")
  cacheLife("max")

  return db.platform.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: platformManyPayload,
  })
}

export const findPlatformSlugs = async ({
  where,
  orderBy,
  ...args
}: Prisma.PlatformFindManyArgs) => {
  "use cache"

  cacheTag("platforms")
  cacheLife("max")

  return db.platform.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: { slug: true, updatedAt: true },
  })
}

export const findPlatform = async ({ ...args }: Prisma.PlatformFindFirstArgs = {}) => {
  "use cache"

  cacheTag("platform", `platform-${args.where?.slug}`)
  cacheLife("max")

  return db.platform.findFirst({
    ...args,
    select: platformOnePayload,
  })
}

export const findFeaturedPlatforms = async ({
  where,
  ...args
}: Prisma.PlatformFindManyArgs): Promise<PlatformMany[]> => {
  "use cache"

  cacheTag("featured-platforms")
  cacheLife("max")

  return await findPlatforms({
    where: { isFeatured: true, ...where },
    ...args,
  })
}
