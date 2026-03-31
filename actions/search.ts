"use server"

import { z } from "zod"
import { createServerAction } from "zsa"
import { getMeiliIndex } from "~/services/meilisearch"
import { tryCatch } from "~/utils/helpers"

type PortSearchResult = {
  slug: string
  name: string
  websiteUrl: string
}

type ThemeSearchResult = {
  slug: string
  name: string
  faviconUrl?: string
}

type PlatformSearchResult = {
  slug: string
  name: string
}

export const searchItems = createServerAction()
  .input(z.object({ query: z.string().trim() }))
  .handler(async ({ input: { query } }) => {
    const start = performance.now()

    const { data, error } = await tryCatch(
      Promise.all([
        getMeiliIndex("ports").search<PortSearchResult>(query, {
          rankingScoreThreshold: 0.5,
          hybrid: { embedder: "openAi", semanticRatio: 0.5 },
          attributesToRetrieve: ["slug", "name", "websiteUrl"],
          filter: ["status = 'Published'"],
          sort: ["isFeatured:desc", "score:desc"],
        }),

        getMeiliIndex("themes").search<ThemeSearchResult>(query, {
          rankingScoreThreshold: 0.5,
          hybrid: { embedder: "openAi", semanticRatio: 0.5 },
          attributesToRetrieve: ["slug", "name", "faviconUrl"],
          sort: ["pageviews:desc"],
        }),

        getMeiliIndex("platforms").search<PlatformSearchResult>(query, {
          rankingScoreThreshold: 0.6,
          hybrid: { embedder: "openAi", semanticRatio: 0.5 },
          attributesToRetrieve: ["slug", "name"],
        }),
      ]),
    )

    console.log(`Search: ${Math.round(performance.now() - start)}ms`)

    if (error) {
      console.error(error)
      return
    }

    return data
  })
