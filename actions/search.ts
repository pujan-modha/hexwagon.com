"use server";

import { z } from "zod";
import { createServerAction } from "zsa";
import { getMeiliIndex } from "~/services/meilisearch";

const searchableIndexes = ["ports", "themes", "platforms"] as const;

const searchInputSchema = z.object({
  query: z.string().trim().min(1),
  indexes: z.array(z.enum(searchableIndexes)).optional(),
});

type PortSearchResult = {
  id: string;
  slug: string;
  name: string;
  websiteUrl?: string | null;
  repositoryUrl?: string | null;
  themeSlug?: string;
  platformSlug?: string;
};

type ThemeSearchResult = {
  slug: string;
  name: string;
  faviconUrl?: string;
};

type PlatformSearchResult = {
  slug: string;
  name: string;
};

type SearchResultPayload<T> = {
  hits: T[];
  estimatedTotalHits: number;
  processingTimeMs: number;
};

const createEmptyResult = <T>(): SearchResultPayload<T> => ({
  hits: [],
  estimatedTotalHits: 0,
  processingTimeMs: 0,
});

export const searchItems = createServerAction()
  .input(searchInputSchema)
  .handler(async ({ input: { query, indexes = [...searchableIndexes] } }) => {
    const start = performance.now();
    const shouldSearchPorts = indexes.includes("ports");
    const shouldSearchThemes = indexes.includes("themes");
    const shouldSearchPlatforms = indexes.includes("platforms");

    const emptyPorts = createEmptyResult<PortSearchResult>();
    const emptyThemes = createEmptyResult<ThemeSearchResult>();
    const emptyPlatforms = createEmptyResult<PlatformSearchResult>();

    const [portsResult, themesResult, platformsResult] =
      await Promise.allSettled([
        shouldSearchPorts
          ? getMeiliIndex("ports").search<PortSearchResult>(query, {
              rankingScoreThreshold: 0.5,
              hybrid: { embedder: "openAi", semanticRatio: 0.5 },
              attributesToRetrieve: [
                "id",
                "slug",
                "name",
                "websiteUrl",
                "repositoryUrl",
                "themeSlug",
                "platformSlug",
              ],
              filter: ["status = 'Published'"],
            })
          : Promise.resolve(emptyPorts),

        shouldSearchThemes
          ? getMeiliIndex("themes").search<ThemeSearchResult>(query, {
              rankingScoreThreshold: 0.5,
              hybrid: { embedder: "openAi", semanticRatio: 0.5 },
              attributesToRetrieve: ["slug", "name", "faviconUrl"],
            })
          : Promise.resolve(emptyThemes),

        shouldSearchPlatforms
          ? getMeiliIndex("platforms").search<PlatformSearchResult>(query, {
              rankingScoreThreshold: 0.6,
              hybrid: { embedder: "openAi", semanticRatio: 0.5 },
              attributesToRetrieve: ["slug", "name"],
            })
          : Promise.resolve(emptyPlatforms),
      ]);

    console.log(`Search: ${Math.round(performance.now() - start)}ms`);

    const ports =
      portsResult.status === "fulfilled" ? portsResult.value : emptyPorts;
    const themes =
      themesResult.status === "fulfilled" ? themesResult.value : emptyThemes;
    const platforms =
      platformsResult.status === "fulfilled"
        ? platformsResult.value
        : emptyPlatforms;

    if (portsResult.status === "rejected") console.error(portsResult.reason);
    if (themesResult.status === "rejected") console.error(themesResult.reason);
    if (platformsResult.status === "rejected")
      console.error(platformsResult.reason);

    return {
      ports,
      themes,
      platforms,
    };
  });
