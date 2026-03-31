import { type Prisma, PortStatus } from "@prisma/client";
import { platformManyPayload } from "~/server/web/platforms/payloads";
import { tagManyPayload } from "~/server/web/tags/payloads";
import { themeManyPayload } from "~/server/web/themes/payloads";
import { db } from "~/services/db";
import { getMeiliIndex } from "~/services/meilisearch";

/**
 * Index ports in MeiliSearch
 * @returns Enqueued task
 */
export const indexPorts = async ({
  where,
}: {
  where?: Prisma.PortWhereInput;
}) => {
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
  });

  if (!ports.length) return;

  return await getMeiliIndex("ports").addDocuments(
    ports.map((port) => ({
      id: port.id,
      name: port.name,
      slug: port.slug,
      description: port.description,
      websiteUrl: port.repositoryUrl,
      faviconUrl: port.faviconUrl,
      isFeatured: port.isFeatured,
      score: port.score,
      pageviews: port.pageviews,
      status: port.status,
      theme: port.theme.name,
      platform: port.platform.name,
      tags: port.tags.map((t) => t.slug),
    })),
  );
};

/**
 * Index themes in MeiliSearch
 * @returns Enqueued task
 */
export const indexThemes = async ({
  where,
}: {
  where?: Prisma.ThemeWhereInput;
}) => {
  const themes = await db.theme.findMany({ where });

  if (!themes.length) return;

  return await getMeiliIndex("themes").addDocuments(
    themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      slug: theme.slug,
      description: theme.description,
      websiteUrl: theme.websiteUrl,
      faviconUrl: theme.faviconUrl,
      pageviews: theme.pageviews,
    })),
  );
};

/**
 * Index platforms in MeiliSearch
 * @param platforms
 * @returns Enqueued task
 */
export const indexPlatforms = async ({
  where,
}: {
  where?: Prisma.PlatformWhereInput;
}) => {
  const platforms = await db.platform.findMany({ where });

  if (!platforms.length) return;

  return await getMeiliIndex("platforms").addDocuments(
    platforms.map((platform) => ({
      id: platform.id,
      name: platform.name,
      slug: platform.slug,
      description: platform.description,
      websiteUrl: platform.websiteUrl,
      faviconUrl: platform.faviconUrl,
      pageviews: platform.pageviews,
    })),
  );
};

export const indexTools = indexPorts;
export const indexAlternatives = indexThemes;
export const indexCategories = indexPlatforms;
