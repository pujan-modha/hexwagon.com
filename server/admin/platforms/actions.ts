"use server";

import { getUrlHostname, slugify } from "@primoui/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import {
  normalizeImageUrlToS3,
  removeS3Directories,
  uploadFavicon,
} from "~/lib/media";
import { adminProcedure } from "~/lib/safe-actions";
import { platformSchema } from "~/server/admin/platforms/schema";
import { db } from "~/services/db";
import { tryCatch } from "~/utils/helpers";

export const upsertPlatform = adminProcedure
  .createServerAction()
  .input(platformSchema)
  .handler(async ({ input: { id, ...input } }) => {
    const slug = input.slug || slugify(input.name);
    const providedFaviconUrl = input.faviconUrl?.trim();
    const websiteUrl = input.websiteUrl?.trim();

    let faviconUrl: string | null = null;

    if (providedFaviconUrl) {
      faviconUrl = await normalizeImageUrlToS3({
        imageUrl: providedFaviconUrl,
        s3Path: `platforms/${slug}/favicon`,
      });
    } else if (websiteUrl) {
      faviconUrl =
        (
          await tryCatch(
            uploadFavicon(getUrlHostname(websiteUrl), `platforms/${slug}`),
          )
        ).data ?? null;
    }

    const platform = id
      ? await db.platform.update({
          where: { id },
          data: { ...input, slug, faviconUrl },
        })
      : await db.platform.create({
          data: { ...input, slug, faviconUrl },
        });

    revalidateTag("platforms", "max");
    revalidateTag(`platform-${platform.slug}`, "max");

    return platform;
  });

export const deletePlatforms = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    const platforms = await db.platform.findMany({
      where: { id: { in: ids } },
      select: { slug: true },
    });

    await db.platform.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/admin/platforms");
    revalidateTag("platforms", "max");

    after(async () => {
      await removeS3Directories(
        platforms.map((platform) => `platforms/${platform.slug}`),
      );
    });

    return true;
  });
