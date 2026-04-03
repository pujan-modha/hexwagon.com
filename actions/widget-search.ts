"use server"

import { z } from "zod"
import { createServerAction } from "zsa"
import { db } from "~/services/db"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

const SEARCH_LIMIT = 10

export const searchThemesAction = createServerAction()
  .input(z.object({ query: z.string().trim().min(2) }))
  .handler(async ({ input: { query } }) => {
    const { data, error } = await tryCatch(
      getMeiliIndex("themes").search<{
        id: string
        name: string
        slug: string
        faviconUrl?: string | null
        isVerified?: boolean
      }>(query, {
        limit: SEARCH_LIMIT,
        rankingScoreThreshold: 0.5,
        hybrid: { embedder: "openAi", semanticRatio: 0.5 },
        attributesToRetrieve: ["id", "name", "slug", "faviconUrl", "isVerified"],
      }),
    )

    if (!error && data?.hits.length) {
      return data.hits
    }

    const themes = await db.theme.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        faviconUrl: true,
        _count: { select: { maintainers: true } },
      },
      take: SEARCH_LIMIT,
      orderBy: { name: "asc" },
    })

    return themes.map(theme => ({
      id: theme.id,
      name: theme.name,
      slug: theme.slug,
      faviconUrl: theme.faviconUrl,
      isVerified: theme._count.maintainers > 0,
    }))
  })

export const searchPlatformsAction = createServerAction()
  .input(z.object({ query: z.string().trim().min(2) }))
  .handler(async ({ input: { query } }) => {
    const { data, error } = await tryCatch(
      getMeiliIndex("platforms").search<{
        id: string
        name: string
        slug: string
        faviconUrl?: string | null
        isVerified?: boolean
      }>(query, {
        limit: SEARCH_LIMIT,
        rankingScoreThreshold: 0.5,
        hybrid: { embedder: "openAi", semanticRatio: 0.5 },
        attributesToRetrieve: ["id", "name", "slug", "faviconUrl", "isVerified"],
      }),
    )

    if (!error && data?.hits.length) {
      return data.hits
    }

    const platforms = await db.platform.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        faviconUrl: true,
        isFeatured: true,
      },
      take: SEARCH_LIMIT,
      orderBy: { name: "asc" },
    })

    return platforms.map(platform => ({
      id: platform.id,
      name: platform.name,
      slug: platform.slug,
      faviconUrl: platform.faviconUrl,
      isVerified: platform.isFeatured,
    }))
  })
