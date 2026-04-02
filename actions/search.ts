"use server";

import { PortStatus } from "@prisma/client";
import { z } from "zod";
import { createServerAction } from "zsa";
import { db } from "~/services/db";
import { getMeiliIndex } from "~/services/meilisearch";

const searchableIndexes = ["ports", "themes", "platforms"] as const;
type SearchableIndex = (typeof searchableIndexes)[number];

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
  isVerified?: boolean;
};

type PlatformSearchResult = {
  slug: string;
  name: string;
  faviconUrl?: string;
  isVerified?: boolean;
};

type SearchResultPayload<T> = {
  hits: T[];
  estimatedTotalHits: number;
  processingTimeMs: number;
};

type FallbackReason = "error" | "empty";

type SearchTelemetry = {
  usedFallback: boolean;
  queryLength: number;
  fallbackIndexes: SearchableIndex[];
  fallbackReasons: Partial<Record<SearchableIndex, FallbackReason>>;
  meiliFailures: SearchableIndex[];
};

const FALLBACK_LIMIT = 8;

const createEmptyResult = <T>(): SearchResultPayload<T> => ({
  hits: [],
  estimatedTotalHits: 0,
  processingTimeMs: 0,
});

const fallbackSearchPorts = async (
  query: string,
): Promise<SearchResultPayload<PortSearchResult>> => {
  const start = performance.now();
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
  };

  const [ports, totalCount] = await Promise.all([
    db.port.findMany({
      where,
      take: FALLBACK_LIMIT,
      orderBy: [{ isFeatured: "desc" }, { score: "desc" }],
      include: {
        theme: { select: { slug: true } },
        platform: { select: { slug: true } },
      },
    }),

    db.port.count({ where }),
  ]);

  return {
    hits: ports.map((port) => ({
      id: port.id,
      slug: port.slug,
      name: port.name ?? port.slug,
      repositoryUrl: port.repositoryUrl,
      themeSlug: port.theme.slug,
      platformSlug: port.platform.slug,
    })),
    estimatedTotalHits: totalCount,
    processingTimeMs: Math.round(performance.now() - start),
  };
};

const fallbackSearchThemes = async (
  query: string,
): Promise<SearchResultPayload<ThemeSearchResult>> => {
  const start = performance.now();
  const where = {
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
    ],
  };

  const [themes, totalCount] = await Promise.all([
    db.theme.findMany({
      where,
      take: FALLBACK_LIMIT,
      orderBy: { pageviews: "desc" },
      select: {
        slug: true,
        name: true,
        faviconUrl: true,
        _count: {
          select: {
            maintainers: true,
          },
        },
      },
    }),

    db.theme.count({ where }),
  ]);

  return {
    hits: themes.map((theme) => ({
      slug: theme.slug,
      name: theme.name,
      faviconUrl: theme.faviconUrl ?? undefined,
      isVerified: theme._count.maintainers > 0,
    })),
    estimatedTotalHits: totalCount,
    processingTimeMs: Math.round(performance.now() - start),
  };
};

const fallbackSearchPlatforms = async (
  query: string,
): Promise<SearchResultPayload<PlatformSearchResult>> => {
  const start = performance.now();
  const where = {
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
    ],
  };

  const [platforms, totalCount] = await Promise.all([
    db.platform.findMany({
      where,
      take: FALLBACK_LIMIT,
      orderBy: { pageviews: "desc" },
      select: {
        slug: true,
        name: true,
        faviconUrl: true,
        isFeatured: true,
      },
    }),

    db.platform.count({ where }),
  ]);

  return {
    hits: platforms.map((platform) => ({
      slug: platform.slug,
      name: platform.name,
      faviconUrl: platform.faviconUrl ?? undefined,
      isVerified: platform.isFeatured,
    })),
    estimatedTotalHits: totalCount,
    processingTimeMs: Math.round(performance.now() - start),
  };
};

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
              attributesToRetrieve: [
                "slug",
                "name",
                "faviconUrl",
                "isVerified",
              ],
            })
          : Promise.resolve(emptyThemes),

        shouldSearchPlatforms
          ? getMeiliIndex("platforms").search<PlatformSearchResult>(query, {
              rankingScoreThreshold: 0.6,
              hybrid: { embedder: "openAi", semanticRatio: 0.5 },
              attributesToRetrieve: [
                "slug",
                "name",
                "faviconUrl",
                "isVerified",
              ],
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

    const portsFallbackReason: FallbackReason | null = !shouldSearchPorts
      ? null
      : portsResult.status === "rejected"
        ? "error"
        : ports.hits.length === 0
          ? "empty"
          : null;

    const themesFallbackReason: FallbackReason | null = !shouldSearchThemes
      ? null
      : themesResult.status === "rejected"
        ? "error"
        : themes.hits.length === 0
          ? "empty"
          : null;

    const platformsFallbackReason: FallbackReason | null =
      !shouldSearchPlatforms
        ? null
        : platformsResult.status === "rejected"
          ? "error"
          : platforms.hits.length === 0
            ? "empty"
            : null;

    const usePortsFallback = shouldSearchPorts && Boolean(portsFallbackReason);
    const useThemesFallback =
      shouldSearchThemes && Boolean(themesFallbackReason);
    const usePlatformsFallback =
      shouldSearchPlatforms && Boolean(platformsFallbackReason);

    const [fallbackPorts, fallbackThemes, fallbackPlatforms] =
      await Promise.all([
        usePortsFallback ? fallbackSearchPorts(query) : Promise.resolve(null),
        useThemesFallback ? fallbackSearchThemes(query) : Promise.resolve(null),
        usePlatformsFallback
          ? fallbackSearchPlatforms(query)
          : Promise.resolve(null),
      ]);

    if (portsResult.status === "rejected") console.error(portsResult.reason);
    if (themesResult.status === "rejected") console.error(themesResult.reason);
    if (platformsResult.status === "rejected")
      console.error(platformsResult.reason);

    const fallbackReasons = {
      ...(portsFallbackReason ? { ports: portsFallbackReason } : {}),
      ...(themesFallbackReason ? { themes: themesFallbackReason } : {}),
      ...(platformsFallbackReason
        ? { platforms: platformsFallbackReason }
        : {}),
    } satisfies Partial<Record<SearchableIndex, FallbackReason>>;

    const fallbackIndexes = Object.keys(fallbackReasons) as SearchableIndex[];
    const meiliFailures = (
      [
        portsResult.status === "rejected" ? "ports" : null,
        themesResult.status === "rejected" ? "themes" : null,
        platformsResult.status === "rejected" ? "platforms" : null,
      ] as const
    ).filter((value): value is SearchableIndex => value !== null);

    const telemetry: SearchTelemetry = {
      usedFallback: fallbackIndexes.length > 0,
      queryLength: query.length,
      fallbackIndexes,
      fallbackReasons,
      meiliFailures,
    };

    if (telemetry.usedFallback) {
      console.warn("search_meili_fallback", {
        indexes,
        fallbackIndexes: telemetry.fallbackIndexes,
        fallbackReasons: telemetry.fallbackReasons,
        meiliFailures: telemetry.meiliFailures,
        queryLength: telemetry.queryLength,
      });
    }

    return {
      ports: fallbackPorts ?? ports,
      themes: fallbackThemes ?? themes,
      platforms: fallbackPlatforms ?? platforms,
      telemetry,
    };
  });
