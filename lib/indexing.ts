import { ConfigStatus, PortStatus, type Prisma } from "@prisma/client"
import { parseConfigFonts } from "~/lib/configs"
import { buildEntitySearchTerms, buildSearchTerms } from "~/lib/search-terms"
import { configManyPayload } from "~/server/web/configs/payloads"
import { platformManyPayload } from "~/server/web/platforms/payloads"
import { tagManyPayload } from "~/server/web/tags/payloads"
import { themeManyPayload } from "~/server/web/themes/payloads"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

const resetIndexDocuments = async (indexName: "ports" | "themes" | "platforms" | "configs") => {
  const { error } = await tryCatch(getMeiliIndex(indexName).deleteAllDocuments())

  if (
    error &&
    "code" in error &&
    error.code !== "index_not_found" &&
    !String("message" in error ? error.message : "").includes("not found")
  ) {
    throw error
  }
}

/**
 * Index ports in MeiliSearch
 * @returns Enqueued task
 */
export const indexPorts = async ({
  where,
  replace = false,
}: {
  where?: Prisma.PortWhereInput
  replace?: boolean
}) => {
  if (replace) {
    await resetIndexDocuments("ports")
  }

  const ports = await db.port.findMany({
    where: {
      status: { in: [PortStatus.Scheduled, PortStatus.Published] },
      ...where,
    },
    include: {
      theme: { select: themeManyPayload },
      platform: { select: platformManyPayload },
      tags: { select: tagManyPayload },
    },
  })

  if (!ports.length) return

  return await getMeiliIndex("ports").addDocuments(
    ports.map(port => ({
      id: port.id,
      name: port.name,
      slug: port.slug,
      description: port.description,
      repositoryUrl: port.repositoryUrl,
      websiteUrl: port.repositoryUrl,
      faviconUrl: port.faviconUrl,
      isFeatured: port.isFeatured,
      score: port.score,
      pageviews: port.pageviews,
      status: port.status,
      searchAliases: port.searchAliases,
      theme: port.theme.name,
      themeSlug: port.theme.slug,
      platform: port.platform.name,
      platformSlug: port.platform.slug,
      tags: port.tags.map(t => t.slug),
      searchTerms: buildSearchTerms(
        port.name,
        port.slug,
        port.description,
        port.searchAliases,
        port.theme.name,
        port.theme.slug,
        port.theme.searchAliases,
        port.platform.name,
        port.platform.slug,
        port.platform.searchAliases,
        ...port.tags.map(tag => tag.slug),
      ),
    })),
  )
}

/**
 * Index themes in MeiliSearch
 * @returns Enqueued task
 */
export const indexThemes = async ({
  where,
  replace = false,
}: {
  where?: Prisma.ThemeWhereInput
  replace?: boolean
}) => {
  if (replace) {
    await resetIndexDocuments("themes")
  }

  const themes = await db.theme.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      searchAliases: true,
      websiteUrl: true,
      faviconUrl: true,
      pageviews: true,
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
  })

  if (!themes.length) return

  return await getMeiliIndex("themes").addDocuments(
    themes.map(theme => ({
      id: theme.id,
      name: theme.name,
      slug: theme.slug,
      description: theme.description,
      websiteUrl: theme.websiteUrl,
      faviconUrl: theme.faviconUrl,
      pageviews: theme.pageviews,
      isVerified: theme._count.maintainers > 0,
      portsCount: theme._count.ports,
      searchAliases: theme.searchAliases,
      searchTerms: buildSearchTerms(theme.name, theme.slug, theme.description, theme.searchAliases),
    })),
  )
}

/**
 * Index platforms in MeiliSearch
 * @param platforms
 * @returns Enqueued task
 */
export const indexPlatforms = async ({
  where,
  replace = false,
}: {
  where?: Prisma.PlatformWhereInput
  replace?: boolean
}) => {
  if (replace) {
    await resetIndexDocuments("platforms")
  }

  const platforms = await db.platform.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      searchAliases: true,
      websiteUrl: true,
      faviconUrl: true,
      pageviews: true,
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
  })

  if (!platforms.length) return

  return await getMeiliIndex("platforms").addDocuments(
    platforms.map(platform => ({
      id: platform.id,
      name: platform.name,
      slug: platform.slug,
      description: platform.description,
      websiteUrl: platform.websiteUrl,
      faviconUrl: platform.faviconUrl,
      pageviews: platform.pageviews,
      isVerified: platform.isFeatured,
      portsCount: platform._count.ports,
      searchAliases: platform.searchAliases,
      searchTerms: buildSearchTerms(
        platform.name,
        platform.slug,
        platform.description,
        platform.searchAliases,
      ),
    })),
  )
}

/**
 * Index configs in MeiliSearch
 * @returns Enqueued task
 */
export const indexConfigs = async ({
  where,
  replace = false,
}: {
  where?: Prisma.ConfigWhereInput
  replace?: boolean
}) => {
  if (replace) {
    await resetIndexDocuments("configs")
  }

  const configs = await db.config.findMany({
    where: {
      status: ConfigStatus.Published,
      ...where,
    },
    select: {
      ...configManyPayload,
      configThemes: {
        select: {
          isPrimary: true,
          theme: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { theme: { name: "asc" } }],
      },
      configPlatforms: {
        select: {
          isPrimary: true,
          platform: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { platform: { name: "asc" } }],
      },
    },
  })

  if (!configs.length) return

  return await getMeiliIndex("configs").addDocuments(
    configs.map(config => ({
      id: config.id,
      name: config.name,
      slug: config.slug,
      description: config.description,
      searchAliases: config.searchAliases,
      repositoryUrl: config.repositoryUrl,
      websiteUrl: config.websiteUrl,
      faviconUrl: config.faviconUrl,
      screenshotUrl: config.screenshotUrl,
      isFeatured: config.isFeatured,
      pageviews: config.pageviews,
      status: config.status,
      themesCount: config._count.configThemes,
      platformsCount: config._count.configPlatforms,
      fontNames: parseConfigFonts(config.fonts).map(font => font.name),
      themeNames: config.configThemes.map(entry => entry.theme.name),
      themeSlugs: config.configThemes.map(entry => entry.theme.slug),
      platformNames: config.configPlatforms.map(entry => entry.platform.name),
      platformSlugs: config.configPlatforms.map(entry => entry.platform.slug),
      searchTerms: buildSearchTerms(
        config.name,
        config.slug,
        config.description,
        config.searchAliases,
        ...parseConfigFonts(config.fonts).map(font => font.name),
        ...config.configThemes.flatMap(entry => buildEntitySearchTerms(entry.theme)),
        ...config.configPlatforms.flatMap(entry => buildEntitySearchTerms(entry.platform)),
      ),
    })),
  )
}

export const indexTools = indexPorts
export const indexAlternatives = indexThemes
export const indexCategories = indexPlatforms
