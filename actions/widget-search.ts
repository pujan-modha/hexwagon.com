"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { db } from "~/services/db";
import { getMeiliIndex } from "~/services/meilisearch";
import { tryCatch } from "~/utils/helpers";

const SEARCH_LIMIT = 10;

export const searchThemesAction = createServerAction()
  .input(z.object({ query: z.string().trim().min(2) }))
  .handler(async ({ input: { query } }) => {
    const { data, error } = await tryCatch(
      getMeiliIndex("themes").search<{
        id: string;
        name: string;
        slug: string;
      }>(query, {
        limit: SEARCH_LIMIT,
        rankingScoreThreshold: 0.5,
        hybrid: { embedder: "openAi", semanticRatio: 0.5 },
        attributesToRetrieve: ["id", "name", "slug"],
      }),
    );

    if (!error && data?.hits.length) {
      return data.hits;
    }

    const themes = await db.theme.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, slug: true },
      take: SEARCH_LIMIT,
      orderBy: { name: "asc" },
    });

    return themes;
  });

export const searchPlatformsAction = createServerAction()
  .input(z.object({ query: z.string().trim().min(2) }))
  .handler(async ({ input: { query } }) => {
    const { data, error } = await tryCatch(
      getMeiliIndex("platforms").search<{
        id: string;
        name: string;
        slug: string;
      }>(query, {
        limit: SEARCH_LIMIT,
        rankingScoreThreshold: 0.5,
        hybrid: { embedder: "openAi", semanticRatio: 0.5 },
        attributesToRetrieve: ["id", "name", "slug"],
      }),
    );

    if (!error && data?.hits.length) {
      return data.hits;
    }

    const platforms = await db.platform.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, slug: true },
      take: SEARCH_LIMIT,
      orderBy: { name: "asc" },
    });

    return platforms;
  });
