import { performance } from "node:perf_hooks"
import { PortStatus, type Prisma } from "@prisma/client"
import type { SearchSimilarDocumentsParams } from "meilisearch"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import type { FilterSchema } from "~/server/web/shared/schema"
import { themeManyPayload, themeOnePayload } from "~/server/web/themes/payloads"
import type { ThemeMany } from "~/server/web/themes/payloads"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

const getThemeOrderBy = (sort: string): Prisma.ThemeFindManyArgs["orderBy"] => {
  if (sort && sort !== "default" && sort.includes(".")) {
    const [sortBy, sortOrder] = sort.split(".") as [string, Prisma.SortOrder]

    if (
      (sortOrder === "asc" || sortOrder === "desc") &&
      ["name", "pageviews", "createdAt", "updatedAt", "order"].includes(sortBy)
    ) {
      return { [sortBy]: sortOrder } as Prisma.ThemeFindManyArgs["orderBy"]
    }
  }

  return { pageviews: "desc" }
}

export const searchThemes = async (search: FilterSchema, where?: Prisma.ThemeWhereInput) => {
  "use cache"

  cacheTag("themes")
  cacheLife("max")

  const { q, page, sort, perPage } = search
  const start = performance.now()
  const skip = (page - 1) * perPage
  const take = perPage

  const orderBy = getThemeOrderBy(sort)

  if (q) {
    const meiliLimit = sort === "default" ? take : 5000
    const meiliOffset = sort === "default" ? skip : 0

    const { data, error } = await tryCatch(
      getMeiliIndex("themes").search<{ id: string }>(q, {
        limit: meiliLimit,
        offset: meiliOffset,
        attributesToRetrieve: ["id"],
      }),
    )

    if (!error && data) {
      const ids = Array.from(new Set(data.hits.map(hit => hit.id)))

      if (!ids.length) {
        return { themes: [], totalCount: 0, pageCount: 0 }
      }

      const whereIds: Prisma.ThemeWhereInput = {
        id: { in: ids },
        ...where,
      }

      if (sort === "default") {
        const themes = await db.theme.findMany({
          where: whereIds,
          select: themeManyPayload,
        })

        const themeMap = new Map(themes.map(theme => [theme.id, theme]))
        const orderedThemes = ids
          .map(id => themeMap.get(id))
          .filter((theme): theme is ThemeMany => Boolean(theme))

        const totalCount = data.estimatedTotalHits ?? orderedThemes.length
        const pageCount = Math.ceil(totalCount / perPage)

        console.log(`Themes search: ${Math.round(performance.now() - start)}ms`)
        return { themes: orderedThemes, totalCount, pageCount }
      }

      const themes = await db.theme.findMany({
        where: whereIds,
        select: themeManyPayload,
        orderBy,
        take,
        skip,
      })

      const totalCount = data.estimatedTotalHits ?? ids.length
      const pageCount = Math.ceil(totalCount / perPage)

      console.log(`Themes search: ${Math.round(performance.now() - start)}ms`)
      return { themes, totalCount, pageCount }
    }
  }

  const whereQuery: Prisma.ThemeWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [themes, totalCount] = await db.$transaction([
    db.theme.findMany({
      where: { ...whereQuery, ...where },
      select: themeManyPayload,
      orderBy,
      take,
      skip,
    }),

    db.theme.count({
      where: { ...whereQuery, ...where },
    }),
  ])

  console.log(`Themes search: ${Math.round(performance.now() - start)}ms`)

  const pageCount = Math.ceil(totalCount / perPage)
  return { themes, totalCount, pageCount }
}

export const findRelatedThemeIds = async ({ id, ...params }: SearchSimilarDocumentsParams) => {
  "use cache"

  cacheTag(`related-theme-ids-${id}`)
  cacheLife("hours")

  const { data, error } = await tryCatch(
    getMeiliIndex("themes").searchSimilarDocuments<{ id: string }>({
      id,
      limit: 6,
      embedder: "openAi",
      attributesToRetrieve: ["id"],
      ...params,
    }),
  )

  if (error) {
    console.error(error)
    return []
  }

  return data.hits.map(hit => hit.id)
}

export const findRelatedThemes = async ({ id, ...params }: SearchSimilarDocumentsParams) => {
  "use cache"

  cacheTag(`related-themes-${id}`)
  cacheLife("hours")

  const ids = await findRelatedThemeIds({ id, ...params })

  return await db.theme.findMany({
    where: { id: { in: ids } },
    select: themeManyPayload,
  })
}

export const findFeaturedThemes = async ({
  where,
  ...args
}: Prisma.ThemeFindManyArgs): Promise<ThemeMany[]> => {
  "use cache"

  cacheTag("featured-themes")
  cacheLife("max")

  return await findThemes({
    where: { isFeatured: true, ...where },
    ...args,
  })
}

export const findThemes = async ({ where, orderBy, ...args }: Prisma.ThemeFindManyArgs) => {
  "use cache"

  cacheTag("themes")
  cacheLife("max")

  return db.theme.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: themeManyPayload,
  })
}

export const findThemeSlugs = async ({ where, orderBy, ...args }: Prisma.ThemeFindManyArgs) => {
  "use cache"

  cacheTag("themes")
  cacheLife("max")

  return db.theme.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: { slug: true, updatedAt: true },
  })
}

export const findTheme = async ({ ...args }: Prisma.ThemeFindFirstArgs = {}) => {
  "use cache"

  cacheTag("theme", `theme-${args.where?.slug}`)
  cacheLife("max")

  return db.theme.findFirst({
    ...args,
    select: themeOnePayload,
  })
}
