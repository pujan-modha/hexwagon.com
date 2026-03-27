import { performance } from "node:perf_hooks";
import { type Prisma, PortStatus } from "@prisma/client";
import type { SearchSimilarDocumentsParams } from "meilisearch";
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";
import {
  themeManyPayload,
  themeOnePayload,
} from "~/server/web/themes/payloads";
import type { ThemeMany } from "~/server/web/themes/payloads";
import type { FilterSchema } from "~/server/web/shared/schema";
import { db } from "~/services/db";
import { getMeiliIndex } from "~/services/meilisearch";
import { tryCatch } from "~/utils/helpers";

export const searchThemes = async (
  search: FilterSchema,
  where?: Prisma.ThemeWhereInput,
) => {
  "use cache";

  cacheTag("themes");
  cacheLife("max");

  const { q, page, sort, perPage } = search;
  const start = performance.now();
  const skip = (page - 1) * perPage;
  const take = perPage;

  let orderBy: Prisma.ThemeFindManyArgs["orderBy"] = { pageviews: "desc" };

  if (sort !== "default") {
    const [sortBy, sortOrder] = sort.split(".") as [
      keyof typeof orderBy,
      Prisma.SortOrder,
    ];
    orderBy =
      sortBy === "ports"
        ? { ports: { _count: sortOrder } }
        : { [sortBy]: sortOrder };
  }

  const whereQuery: Prisma.ThemeWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

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
  ]);

  console.log(`Themes search: ${Math.round(performance.now() - start)}ms`);

  const pageCount = Math.ceil(totalCount / perPage);
  return { themes, totalCount, pageCount };
};

export const findRelatedThemeIds = async ({
  id,
  ...params
}: SearchSimilarDocumentsParams) => {
  "use cache";

  cacheTag(`related-theme-ids-${id}`);
  cacheLife("hours");

  const { data, error } = await tryCatch(
    getMeiliIndex("themes").searchSimilarDocuments<{ id: string }>({
      id,
      limit: 6,
      embedder: "openAi",
      attributesToRetrieve: ["id"],
      rankingScoreThreshold: 0.6,
      ...params,
    }),
  );

  if (error) {
    console.error(error);
    return [];
  }

  return data.hits.map((hit) => hit.id);
};

export const findRelatedThemes = async ({
  id,
  ...params
}: SearchSimilarDocumentsParams) => {
  "use cache";

  cacheTag(`related-themes-${id}`);
  cacheLife("hours");

  const ids = await findRelatedThemeIds({ id, ...params });

  return await db.theme.findMany({
    where: { id: { in: ids } },
    select: themeManyPayload,
  });
};

export const findFeaturedThemes = async ({
  where,
  ...args
}: Prisma.ThemeFindManyArgs): Promise<ThemeMany[]> => {
  "use cache";

  cacheTag("featured-themes");
  cacheLife("max");

  return await findThemes({
    where: { isFeatured: true, ...where },
    ...args,
  });
};

export const findThemes = async ({
  where,
  orderBy,
  ...args
}: Prisma.ThemeFindManyArgs) => {
  "use cache";

  cacheTag("themes");
  cacheLife("max");

  return db.theme.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: themeManyPayload,
  });
};

export const findThemeSlugs = async ({
  where,
  orderBy,
  ...args
}: Prisma.ThemeFindManyArgs) => {
  "use cache";

  cacheTag("themes");
  cacheLife("max");

  return db.theme.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: { slug: true, updatedAt: true },
  });
};

export const findTheme = async ({
  ...args
}: Prisma.ThemeFindFirstArgs = {}) => {
  "use cache";

  cacheTag("theme", `theme-${args.where?.slug}`);
  cacheLife("max");

  return db.theme.findFirst({
    ...args,
    select: themeOnePayload,
  });
};
