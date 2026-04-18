"use server"

import { ConfigStatus, PortStatus } from "@prisma/client"
import { z } from "zod"
import { createServerAction } from "zsa"
import { parseConfigFonts } from "~/lib/configs"
import { buildEntitySearchTerms, buildSearchTerms, matchesSearchTerms } from "~/lib/search-terms"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"

const searchableIndexes = ["ports", "themes", "platforms", "configs"] as const
type SearchableIndex = (typeof searchableIndexes)[number]

const searchInputSchema = z.object({
  query: z.string().trim().min(1),
  indexes: z.array(z.enum(searchableIndexes)).optional(),
})

type PortSearchResult = {
  id: string
  slug: string
  name: string
  status?: PortStatus
  websiteUrl?: string | null
  repositoryUrl?: string | null
  theme?: string
  themeSlug?: string
  platform?: string
  platformSlug?: string
}

type ThemeSearchResult = {
  slug: string
  name: string
  faviconUrl?: string
  isVerified?: boolean
  portsCount?: number
}

type PlatformSearchResult = {
  slug: string
  name: string
  faviconUrl?: string
  isVerified?: boolean
  portsCount?: number
}

type ConfigSearchResult = {
  slug: string
  name: string
  faviconUrl?: string
  repositoryUrl?: string | null
  websiteUrl?: string | null
  themesCount?: number
  platformsCount?: number
}

type SearchResultPayload<T> = {
  hits: T[]
  estimatedTotalHits: number
  processingTimeMs: number
}

type FallbackReason = "error" | "empty"

type SearchTelemetry = {
  usedFallback: boolean
  queryLength: number
  fallbackIndexes: SearchableIndex[]
  fallbackReasons: Partial<Record<SearchableIndex, FallbackReason>>
  meiliFailures: SearchableIndex[]
}

const FALLBACK_LIMIT = 8

const createEmptyResult = <T>(): SearchResultPayload<T> => ({
  hits: [],
  estimatedTotalHits: 0,
  processingTimeMs: 0,
})

const fallbackSearchPorts = async (
  query: string,
): Promise<SearchResultPayload<PortSearchResult>> => {
  const start = performance.now()
  const where = {
    status: PortStatus.Published,
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
      {
        theme: {
          name: { contains: query, mode: "insensitive" as const },
        },
      },
      {
        platform: {
          name: { contains: query, mode: "insensitive" as const },
        },
      },
    ],
  }

  const [ports, totalCount] = await Promise.all([
    db.port.findMany({
      where,
      take: FALLBACK_LIMIT,
      orderBy: [{ isFeatured: "desc" }, { score: "desc" }],
      include: {
        theme: { select: { slug: true, name: true } },
        platform: { select: { slug: true, name: true } },
      },
    }),

    db.port.count({ where }),
  ])

  return {
    hits: ports.map(port => ({
      id: port.id,
      slug: port.slug,
      name: port.name ?? port.slug,
      repositoryUrl: port.repositoryUrl,
      theme: port.theme.name,
      themeSlug: port.theme.slug,
      platform: port.platform.name,
      platformSlug: port.platform.slug,
    })),
    estimatedTotalHits: totalCount,
    processingTimeMs: Math.round(performance.now() - start),
  }
}

const fallbackSearchThemes = async (
  query: string,
): Promise<SearchResultPayload<ThemeSearchResult>> => {
  const start = performance.now()
  const where = {
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
    ],
  }

  const [themes, totalCount] = await Promise.all([
    db.theme.findMany({
      where,
      take: FALLBACK_LIMIT,
      orderBy: { likes: { _count: "desc" } },
      select: {
        slug: true,
        name: true,
        faviconUrl: true,
        _count: {
          select: {
            ports: {
              where: {
                status: PortStatus.Published,
              },
            },
            maintainers: true,
          },
        },
      },
    }),

    db.theme.count({ where }),
  ])

  return {
    hits: themes.map(theme => ({
      slug: theme.slug,
      name: theme.name,
      faviconUrl: theme.faviconUrl ?? undefined,
      isVerified: theme._count.maintainers > 0,
      portsCount: theme._count.ports,
    })),
    estimatedTotalHits: totalCount,
    processingTimeMs: Math.round(performance.now() - start),
  }
}

const fallbackSearchPlatforms = async (
  query: string,
): Promise<SearchResultPayload<PlatformSearchResult>> => {
  const start = performance.now()
  const where = {
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
    ],
  }

  const [platforms, totalCount] = await Promise.all([
    db.platform.findMany({
      where,
      take: FALLBACK_LIMIT,
      orderBy: { likes: { _count: "desc" } },
      select: {
        slug: true,
        name: true,
        faviconUrl: true,
        isFeatured: true,
        _count: {
          select: {
            ports: {
              where: {
                status: PortStatus.Published,
              },
            },
          },
        },
      },
    }),

    db.platform.count({ where }),
  ])

  return {
    hits: platforms.map(platform => ({
      slug: platform.slug,
      name: platform.name,
      faviconUrl: platform.faviconUrl ?? undefined,
      isVerified: platform.isFeatured,
      portsCount: platform._count.ports,
    })),
    estimatedTotalHits: totalCount,
    processingTimeMs: Math.round(performance.now() - start),
  }
}

const fallbackSearchConfigs = async (
  query: string,
): Promise<SearchResultPayload<ConfigSearchResult>> => {
  const start = performance.now()
  const configs = await db.config.findMany({
    where: {
      status: ConfigStatus.Published,
    },
    orderBy: [{ isFeatured: "desc" }, { likes: { _count: "desc" } }, { order: "asc" }],
    select: {
      slug: true,
      name: true,
      description: true,
      content: true,
      searchAliases: true,
      fonts: true,
      faviconUrl: true,
      repositoryUrl: true,
      websiteUrl: true,
      _count: {
        select: {
          configThemes: true,
          configPlatforms: true,
        },
      },
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
  })

  const filteredConfigs = configs.filter(config =>
    matchesSearchTerms({
      query,
      text: [config.name, config.description, config.content],
      terms: buildSearchTerms(
        config.slug,
        config.searchAliases,
        ...parseConfigFonts(config.fonts).map(font => font.name),
        ...config.configThemes.flatMap(entry => buildEntitySearchTerms(entry.theme)),
        ...config.configPlatforms.flatMap(entry => buildEntitySearchTerms(entry.platform)),
      ),
    }),
  )

  return {
    hits: filteredConfigs.slice(0, FALLBACK_LIMIT).map(config => ({
      slug: config.slug,
      name: config.name,
      faviconUrl: config.faviconUrl ?? undefined,
      repositoryUrl: config.repositoryUrl,
      websiteUrl: config.websiteUrl,
      themesCount: config._count.configThemes,
      platformsCount: config._count.configPlatforms,
    })),
    estimatedTotalHits: filteredConfigs.length,
    processingTimeMs: Math.round(performance.now() - start),
  }
}

const enrichPortHits = async (hits: PortSearchResult[]) => {
  const ids = Array.from(new Set(hits.map(hit => hit.id).filter(Boolean)))

  if (!ids.length) {
    return []
  }

  const ports = await db.port.findMany({
    where: {
      id: { in: ids },
      status: PortStatus.Published,
    },
    select: {
      id: true,
      theme: { select: { name: true, slug: true } },
      platform: { select: { name: true, slug: true } },
    },
  })

  const detailsById = new Map(
    ports.map(port => [
      port.id,
      {
        theme: port.theme.name,
        themeSlug: port.theme.slug,
        platform: port.platform.name,
        platformSlug: port.platform.slug,
      },
    ]),
  )

  return hits.flatMap(hit => {
    const details = detailsById.get(hit.id)

    if (!details) {
      return []
    }

    return [
      {
        ...hit,
        theme: hit.theme ?? details.theme,
        themeSlug: hit.themeSlug ?? details.themeSlug,
        platform: hit.platform ?? details.platform,
        platformSlug: hit.platformSlug ?? details.platformSlug,
      },
    ]
  })
}

const enrichThemeHits = async (hits: ThemeSearchResult[]) => {
  const slugs = hits.map(hit => hit.slug)

  if (!slugs.length) {
    return hits
  }

  const themes = await db.theme.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      _count: {
        select: {
          ports: {
            where: {
              status: PortStatus.Published,
            },
          },
        },
      },
    },
  })

  const countsBySlug = new Map(themes.map(theme => [theme.slug, theme._count.ports]))

  return hits.map(hit => ({
    ...hit,
    portsCount: countsBySlug.get(hit.slug) ?? hit.portsCount ?? 0,
  }))
}

const enrichPlatformHits = async (hits: PlatformSearchResult[]) => {
  const slugs = hits.map(hit => hit.slug)

  if (!slugs.length) {
    return hits
  }

  const platforms = await db.platform.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      _count: {
        select: {
          ports: {
            where: {
              status: PortStatus.Published,
            },
          },
        },
      },
    },
  })

  const countsBySlug = new Map(platforms.map(platform => [platform.slug, platform._count.ports]))

  return hits.map(hit => ({
    ...hit,
    portsCount: countsBySlug.get(hit.slug) ?? hit.portsCount ?? 0,
  }))
}

const enrichConfigHits = async (hits: ConfigSearchResult[]) => {
  const slugsNeedingCounts = hits
    .filter(hit => hit.themesCount === undefined || hit.platformsCount === undefined)
    .map(hit => hit.slug)

  if (!slugsNeedingCounts.length) {
    return hits
  }

  const configs = await db.config.findMany({
    where: {
      slug: { in: slugsNeedingCounts },
      status: ConfigStatus.Published,
    },
    select: {
      slug: true,
      _count: {
        select: {
          configThemes: true,
          configPlatforms: true,
        },
      },
    },
  })

  const countsBySlug = new Map(
    configs.map(config => [
      config.slug,
      {
        themesCount: config._count.configThemes,
        platformsCount: config._count.configPlatforms,
      },
    ]),
  )

  return hits.map(hit => {
    const counts = countsBySlug.get(hit.slug)

    return {
      ...hit,
      themesCount: hit.themesCount ?? counts?.themesCount ?? 0,
      platformsCount: hit.platformsCount ?? counts?.platformsCount ?? 0,
    }
  })
}

export const searchItems = createServerAction()
  .input(searchInputSchema)
  .handler(async ({ input: { query, indexes = [...searchableIndexes] } }) => {
    const start = performance.now()
    const shouldSearchPorts = indexes.includes("ports")
    const shouldSearchThemes = indexes.includes("themes")
    const shouldSearchPlatforms = indexes.includes("platforms")
    const shouldSearchConfigs = indexes.includes("configs")

    const emptyPorts = createEmptyResult<PortSearchResult>()
    const emptyThemes = createEmptyResult<ThemeSearchResult>()
    const emptyPlatforms = createEmptyResult<PlatformSearchResult>()
    const emptyConfigs = createEmptyResult<ConfigSearchResult>()

    const [portsResult, themesResult, platformsResult, configsResult] = await Promise.allSettled([
      shouldSearchPorts
        ? getMeiliIndex("ports").search<PortSearchResult>(query, {
            attributesToRetrieve: [
              "id",
              "slug",
              "name",
              "status",
              "websiteUrl",
              "repositoryUrl",
              "theme",
              "themeSlug",
              "platform",
              "platformSlug",
            ],
          })
        : Promise.resolve(emptyPorts),

      shouldSearchThemes
        ? getMeiliIndex("themes").search<ThemeSearchResult>(query, {
            attributesToRetrieve: ["slug", "name", "faviconUrl", "isVerified", "portsCount"],
          })
        : Promise.resolve(emptyThemes),

      shouldSearchPlatforms
        ? getMeiliIndex("platforms").search<PlatformSearchResult>(query, {
            attributesToRetrieve: ["slug", "name", "faviconUrl", "isVerified", "portsCount"],
          })
        : Promise.resolve(emptyPlatforms),

      shouldSearchConfigs
        ? getMeiliIndex("configs").search<ConfigSearchResult>(query, {
            attributesToRetrieve: [
              "slug",
              "name",
              "faviconUrl",
              "repositoryUrl",
              "websiteUrl",
              "themesCount",
              "platformsCount",
            ],
          })
        : Promise.resolve(emptyConfigs),
    ])

    console.log(`Search: ${Math.round(performance.now() - start)}ms`)

    const ports = portsResult.status === "fulfilled" ? portsResult.value : emptyPorts
    const themes = themesResult.status === "fulfilled" ? themesResult.value : emptyThemes
    const platforms =
      platformsResult.status === "fulfilled" ? platformsResult.value : emptyPlatforms
    const configs = configsResult.status === "fulfilled" ? configsResult.value : emptyConfigs

    const portsFallbackReason: FallbackReason | null = !shouldSearchPorts
      ? null
      : portsResult.status === "rejected"
        ? "error"
        : ports.hits.length === 0
          ? "empty"
          : null

    const themesFallbackReason: FallbackReason | null = !shouldSearchThemes
      ? null
      : themesResult.status === "rejected"
        ? "error"
        : themes.hits.length === 0
          ? "empty"
          : null

    const platformsFallbackReason: FallbackReason | null = !shouldSearchPlatforms
      ? null
      : platformsResult.status === "rejected"
        ? "error"
        : platforms.hits.length === 0
          ? "empty"
          : null

    const configsFallbackReason: FallbackReason | null = !shouldSearchConfigs
      ? null
      : configsResult.status === "rejected"
        ? "error"
        : configs.hits.length === 0
          ? "empty"
          : null

    const usePortsFallback = shouldSearchPorts && Boolean(portsFallbackReason)
    const useThemesFallback = shouldSearchThemes && Boolean(themesFallbackReason)
    const usePlatformsFallback = shouldSearchPlatforms && Boolean(platformsFallbackReason)
    const useConfigsFallback = shouldSearchConfigs && Boolean(configsFallbackReason)

    const [fallbackPorts, fallbackThemes, fallbackPlatforms, fallbackConfigs] = await Promise.all([
      usePortsFallback ? fallbackSearchPorts(query) : Promise.resolve(null),
      useThemesFallback ? fallbackSearchThemes(query) : Promise.resolve(null),
      usePlatformsFallback ? fallbackSearchPlatforms(query) : Promise.resolve(null),
      useConfigsFallback ? fallbackSearchConfigs(query) : Promise.resolve(null),
    ])

    if (portsResult.status === "rejected") console.error(portsResult.reason)
    if (themesResult.status === "rejected") console.error(themesResult.reason)
    if (platformsResult.status === "rejected") console.error(platformsResult.reason)
    if (configsResult.status === "rejected") console.error(configsResult.reason)

    const fallbackReasons = {
      ...(portsFallbackReason ? { ports: portsFallbackReason } : {}),
      ...(themesFallbackReason ? { themes: themesFallbackReason } : {}),
      ...(platformsFallbackReason ? { platforms: platformsFallbackReason } : {}),
      ...(configsFallbackReason ? { configs: configsFallbackReason } : {}),
    } satisfies Partial<Record<SearchableIndex, FallbackReason>>

    const fallbackIndexes = Object.keys(fallbackReasons) as SearchableIndex[]
    const meiliFailures = (
      [
        portsResult.status === "rejected" ? "ports" : null,
        themesResult.status === "rejected" ? "themes" : null,
        platformsResult.status === "rejected" ? "platforms" : null,
        configsResult.status === "rejected" ? "configs" : null,
      ] as const
    ).filter((value): value is SearchableIndex => value !== null)

    const telemetry: SearchTelemetry = {
      usedFallback: fallbackIndexes.length > 0,
      queryLength: query.length,
      fallbackIndexes,
      fallbackReasons,
      meiliFailures,
    }

    if (telemetry.usedFallback) {
      console.warn("search_meili_fallback", {
        indexes,
        fallbackIndexes: telemetry.fallbackIndexes,
        fallbackReasons: telemetry.fallbackReasons,
        meiliFailures: telemetry.meiliFailures,
        queryLength: telemetry.queryLength,
      })
    }

    const finalPorts = fallbackPorts ?? ports
    const finalThemes = fallbackThemes ?? themes
    const finalPlatforms = fallbackPlatforms ?? platforms
    const finalConfigs = fallbackConfigs ?? configs

    const [enrichedPortHits, enrichedThemeHits, enrichedPlatformHits, enrichedConfigHits] =
      await Promise.all([
        enrichPortHits(finalPorts.hits),
        enrichThemeHits(finalThemes.hits),
        enrichPlatformHits(finalPlatforms.hits),
        enrichConfigHits(finalConfigs.hits),
      ])

    return {
      ports: {
        ...finalPorts,
        hits: enrichedPortHits,
      },
      themes: {
        ...finalThemes,
        hits: enrichedThemeHits,
      },
      platforms: {
        ...finalPlatforms,
        hits: enrichedPlatformHits,
      },
      configs: {
        ...finalConfigs,
        hits: enrichedConfigHits,
      },
      telemetry,
    }
  })
