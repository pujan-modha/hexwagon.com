import { performance } from "node:perf_hooks"
import { ConfigStatus, EditStatus, type Prisma } from "@prisma/client"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import { parseConfigFonts } from "~/lib/configs"
import { buildEntitySearchTerms, buildSearchTerms, matchesSearchTerms } from "~/lib/search-terms"
import { configManyPayload, configOnePayload } from "~/server/web/configs/payloads"
import type { ConfigMany } from "~/server/web/configs/payloads"
import type { FilterSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

const isMissingConfigTableError = (error: unknown) => {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    (error as { code?: unknown }).code !== "P2021"
  ) {
    return false
  }

  const table = String((error as { meta?: { table?: unknown } }).meta?.table ?? "")
  return ["Config", "ConfigTheme", "ConfigPlatform"].some(name => table.includes(name))
}

const quoteMeiliValues = (values: string[]) =>
  values.map(value => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(", ")

const getConfigOrderBy = (sort: string): Prisma.ConfigFindManyArgs["orderBy"] => {
  if (sort && sort !== "default" && sort.includes(".")) {
    const [sortBy, sortOrder] = sort.split(".") as [string, Prisma.SortOrder]

    if (sortOrder === "asc" || sortOrder === "desc") {
      if (sortBy === "likes") {
        return [{ isFeatured: "desc" }, { likes: { _count: sortOrder } }]
      }

      if (["name", "createdAt", "updatedAt", "order"].includes(sortBy)) {
        return [
          { isFeatured: "desc" },
          { [sortBy]: sortOrder } as Prisma.ConfigOrderByWithRelationInput,
        ]
      }
    }
  }

  return [{ isFeatured: "desc" }, { likes: { _count: "desc" } }, { order: "asc" }, { name: "asc" }]
}

const buildConfigWhereQuery = ({
  q,
  theme,
  platform,
}: Pick<FilterSchema, "q" | "theme" | "platform">): Prisma.ConfigWhereInput => ({
  status: ConfigStatus.Published,
  ...(theme.length && { configThemes: { some: { theme: { slug: { in: theme } } } } }),
  ...(platform.length && {
    configPlatforms: { some: { platform: { slug: { in: platform } } } },
  }),
  ...(q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { searchAliases: { contains: q, mode: "insensitive" } },
        ],
      }
    : {}),
})

const matchesConfigQuery = (
  config: {
    name: string
    slug: string
    description?: string | null
    content?: string | null
    searchAliases?: string | null
    fonts?: unknown
    configThemes: Array<{
      theme: { name: string; slug: string; searchAliases?: string | null }
    }>
    configPlatforms: Array<{
      platform: { name: string; slug: string; searchAliases?: string | null }
    }>
  },
  query: string,
) =>
  matchesSearchTerms({
    query,
    text: [config.name, config.slug, config.description, config.content],
    terms: buildSearchTerms(
      config.searchAliases,
      ...parseConfigFonts(config.fonts).map(font => font.name),
      ...config.configThemes.flatMap(entry => buildEntitySearchTerms(entry.theme)),
      ...config.configPlatforms.flatMap(entry => buildEntitySearchTerms(entry.platform)),
    ),
  })

export const searchConfigs = async (search: FilterSchema, where?: Prisma.ConfigWhereInput) => {
  "use cache"

  cacheTag("configs")
  cacheLife("max")

  const { q, page, sort, perPage, theme, platform } = search
  const start = performance.now()
  const skip = (page - 1) * perPage
  const take = perPage
  const orderBy = getConfigOrderBy(sort)

  const whereQuery = buildConfigWhereQuery({ q, theme, platform })

  if (q) {
    const meiliLimit = sort === "default" ? take : 5000
    const meiliOffset = sort === "default" ? skip : 0
    const meiliFilters = [`status = '${ConfigStatus.Published}'`]

    if (theme.length) {
      meiliFilters.push(`themeSlugs IN [${quoteMeiliValues(theme)}]`)
    }

    if (platform.length) {
      meiliFilters.push(`platformSlugs IN [${quoteMeiliValues(platform)}]`)
    }

    const { data, error } = await tryCatch(
      getMeiliIndex("configs").search<{ id: string }>(q, {
        limit: meiliLimit,
        offset: meiliOffset,
        attributesToRetrieve: ["id"],
        filter: meiliFilters,
      }),
    )

    if (!error && data) {
      const ids = Array.from(new Set(data.hits.map(hit => hit.id)))

      if (!ids.length) {
        return { configs: [], totalCount: 0, pageCount: 0 }
      }

      const whereIds: Prisma.ConfigWhereInput = {
        id: { in: ids },
        status: ConfigStatus.Published,
        ...(theme.length && { configThemes: { some: { theme: { slug: { in: theme } } } } }),
        ...(platform.length && {
          configPlatforms: { some: { platform: { slug: { in: platform } } } },
        }),
        ...where,
      }

      if (sort === "default") {
        const configs = await db.config.findMany({
          where: whereIds,
          select: configManyPayload,
        })

        const configMap = new Map(configs.map(config => [config.id, config]))
        const orderedConfigs = ids
          .map(id => configMap.get(id))
          .filter((config): config is ConfigMany => Boolean(config))

        const totalCount = data.estimatedTotalHits ?? orderedConfigs.length
        const pageCount = Math.ceil(totalCount / perPage)

        console.log(`Configs search: ${Math.round(performance.now() - start)}ms`)
        return { configs: orderedConfigs, totalCount, pageCount }
      }

      const configs = await db.config.findMany({
        where: whereIds,
        select: configManyPayload,
        orderBy,
        take,
        skip,
      })

      const totalCount = data.estimatedTotalHits ?? ids.length
      const pageCount = Math.ceil(totalCount / perPage)

      console.log(`Configs search: ${Math.round(performance.now() - start)}ms`)
      return { configs, totalCount, pageCount }
    }
  }

  const baseWhere: Prisma.ConfigWhereInput = {
    status: ConfigStatus.Published,
    ...(theme.length && { configThemes: { some: { theme: { slug: { in: theme } } } } }),
    ...(platform.length && {
      configPlatforms: { some: { platform: { slug: { in: platform } } } },
    }),
    ...where,
  }

  if (q) {
    const { data, error } = await tryCatch(
      db.config.findMany({
        where: baseWhere,
        orderBy,
        select: {
          ...configManyPayload,
          content: true,
          configThemes: {
            select: {
              theme: {
                select: {
                  name: true,
                  slug: true,
                  searchAliases: true,
                },
              },
            },
          },
          configPlatforms: {
            select: {
              platform: {
                select: {
                  name: true,
                  slug: true,
                  searchAliases: true,
                },
              },
            },
          },
        },
      }),
    )

    if (error) {
      if (isMissingConfigTableError(error)) {
        return { configs: [], totalCount: 0, pageCount: 0 }
      }

      throw error
    }

    const filteredConfigs = data.filter(config => matchesConfigQuery(config, q))
    const totalCount = filteredConfigs.length
    const pageCount = Math.ceil(totalCount / perPage)

    console.log(`Configs search: ${Math.round(performance.now() - start)}ms`)
    return {
      configs: filteredConfigs
        .slice(skip, skip + take)
        .map(({ content, configThemes, configPlatforms, ...config }) => config),
      totalCount,
      pageCount,
    }
  }

  const { data, error } = await tryCatch(
    db.$transaction([
      db.config.findMany({
        where: { ...whereQuery, ...where },
        select: configManyPayload,
        orderBy,
        take,
        skip,
      }),
      db.config.count({
        where: { ...whereQuery, ...where },
      }),
    ]),
  )

  if (error) {
    if (isMissingConfigTableError(error)) {
      return { configs: [], totalCount: 0, pageCount: 0 }
    }

    throw error
  }

  const [configs, totalCount] = data

  console.log(`Configs search: ${Math.round(performance.now() - start)}ms`)

  const pageCount = Math.ceil(totalCount / perPage)
  return { configs, totalCount, pageCount }
}

export const findConfigs = async ({ where, orderBy, ...args }: Prisma.ConfigFindManyArgs) => {
  "use cache"

  cacheTag("configs")
  cacheLife("max")

  const { data, error } = await tryCatch(
    db.config.findMany({
      ...args,
      where: { ...where },
      orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
      select: configManyPayload,
    }),
  )

  if (error) {
    if (isMissingConfigTableError(error)) {
      return []
    }

    throw error
  }

  return data
}

export const findFeaturedConfigs = async ({
  where,
  ...args
}: Prisma.ConfigFindManyArgs): Promise<ConfigMany[]> => {
  "use cache"

  cacheTag("featured-configs")
  cacheLife("max")

  return findConfigs({
    where: { isFeatured: true, status: ConfigStatus.Published, ...where },
    ...args,
  })
}

export const findConfigSlugs = async ({ where, orderBy, ...args }: Prisma.ConfigFindManyArgs) => {
  "use cache"

  cacheTag("configs")
  cacheLife("max")

  const { data, error } = await tryCatch(
    db.config.findMany({
      ...args,
      where: { ...where },
      orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
      select: { slug: true, updatedAt: true },
    }),
  )

  if (error) {
    if (isMissingConfigTableError(error)) {
      return []
    }

    throw error
  }

  return data
}

export const findUserConfigs = async (userId: string) => {
  const { data, error } = await tryCatch(
    db.config.findMany({
      where: { authorId: userId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        content: true,
        repositoryUrl: true,
        license: true,
        fonts: true,
        screenshots: true,
        status: true,
        pageviews: true,
        createdAt: true,
        updatedAt: true,
        configThemes: {
          select: {
            themeId: true,
            theme: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { theme: { name: "asc" } }],
        },
        configPlatforms: {
          select: {
            platformId: true,
            platform: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { platform: { name: "asc" } }],
        },
        pendingEdits: {
          where: { status: EditStatus.Pending },
          select: {
            id: true,
            diff: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  )

  if (error) {
    if (isMissingConfigTableError(error)) {
      return []
    }

    throw error
  }

  return data
}

export const findConfigRouteParams = async () => {
  "use cache"

  cacheTag("configs")
  cacheLife("max")

  const { data, error } = await tryCatch(
    db.config.findMany({
      where: { status: ConfigStatus.Published },
      select: { slug: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  )

  if (error) {
    if (isMissingConfigTableError(error)) {
      return []
    }

    throw error
  }

  return data
}

export const findConfig = async ({ ...args }: Prisma.ConfigFindFirstArgs = {}) => {
  "use cache"

  cacheTag("config", `config-${args.where?.slug}`)
  cacheLife("max")

  const { data, error } = await tryCatch(
    db.config.findFirst({
      ...args,
      select: configOnePayload,
    }),
  )

  if (error) {
    if (isMissingConfigTableError(error)) {
      return null
    }

    throw error
  }

  return data
}

export const findConfigsByTheme = async (
  themeSlug: string,
  search: Partial<Pick<FilterSchema, "q" | "sort" | "perPage">> = {},
) => {
  "use cache"

  cacheTag("configs", `configs-theme-${themeSlug}`)
  cacheLife("max")

  const { q = "", sort = "default", perPage = 500 } = search
  const result = await searchConfigs(
    {
      q,
      sort,
      page: 1,
      perPage,
      theme: [themeSlug],
      platform: [],
      tag: [],
    },
    undefined,
  )

  return result.configs
}

export const findConfigsByPlatform = async (
  platformSlug: string,
  search: Partial<Pick<FilterSchema, "q" | "sort" | "perPage">> = {},
) => {
  "use cache"

  cacheTag("configs", `configs-platform-${platformSlug}`)
  cacheLife("max")

  const { q = "", sort = "default", perPage = 500 } = search
  const result = await searchConfigs(
    {
      q,
      sort,
      page: 1,
      perPage,
      theme: [],
      platform: [platformSlug],
      tag: [],
    },
    undefined,
  )

  return result.configs
}
