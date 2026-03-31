import { performance } from "node:perf_hooks";
import { type Prisma, PortStatus } from "@prisma/client";
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";
import {
  platformManyPayload,
  platformOnePayload,
} from "~/server/web/platforms/payloads";
import type { PlatformMany } from "~/server/web/platforms/payloads";
import type { FilterSchema } from "~/server/web/shared/schema";
import { db } from "~/services/db";

export const searchPlatforms = async (
  search: FilterSchema,
  where?: Prisma.PlatformWhereInput,
) => {
  "use cache";

  cacheTag("platforms");
  cacheLife("max");

  const { q, page, sort, perPage } = search;
  const start = performance.now();
  const skip = (page - 1) * perPage;
  const take = perPage;

  let orderBy: Prisma.PlatformFindManyArgs["orderBy"] = { pageviews: "desc" };

  if (sort && sort !== "default" && sort.includes(".")) {
    const [sortBy, sortOrder] = sort.split(".") as [
      keyof typeof orderBy,
      Prisma.SortOrder,
    ];

    if (sortOrder === "asc" || sortOrder === "desc") {
      orderBy =
        sortBy === "ports"
          ? { ports: { _count: sortOrder } }
          : { [sortBy]: sortOrder };
    }
  }

  const whereQuery: Prisma.PlatformWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [platforms, totalCount] = await db.$transaction([
    db.platform.findMany({
      where: { ...whereQuery, ...where },
      select: platformManyPayload,
      orderBy,
      take,
      skip,
    }),

    db.platform.count({
      where: { ...whereQuery, ...where },
    }),
  ]);

  console.log(`Platforms search: ${Math.round(performance.now() - start)}ms`);

  const pageCount = Math.ceil(totalCount / perPage);
  return { platforms, totalCount, pageCount };
};

export const findPlatforms = async ({
  where,
  orderBy,
  ...args
}: Prisma.PlatformFindManyArgs) => {
  "use cache";

  cacheTag("platforms");
  cacheLife("max");

  return db.platform.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: platformManyPayload,
  });
};

export const findPlatformSlugs = async ({
  where,
  orderBy,
  ...args
}: Prisma.PlatformFindManyArgs) => {
  "use cache";

  cacheTag("platforms");
  cacheLife("max");

  return db.platform.findMany({
    ...args,
    orderBy: orderBy ?? [{ order: "asc" }, { name: "asc" }],
    where: { ...where },
    select: { slug: true, updatedAt: true },
  });
};

export const findPlatform = async ({
  ...args
}: Prisma.PlatformFindFirstArgs = {}) => {
  "use cache";

  cacheTag("platform", `platform-${args.where?.slug}`);
  cacheLife("max");

  return db.platform.findFirst({
    ...args,
    select: platformOnePayload,
  });
};

export const findFeaturedPlatforms = async ({
  where,
  ...args
}: Prisma.PlatformFindManyArgs): Promise<PlatformMany[]> => {
  "use cache";

  cacheTag("featured-platforms");
  cacheLife("max");

  return await findPlatforms({
    where: { isFeatured: true, ...where },
    ...args,
  });
};
