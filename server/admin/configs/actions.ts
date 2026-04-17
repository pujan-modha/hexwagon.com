"use server"

import { getUrlHostname, slugify } from "@primoui/utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { normalizeImageUrlToS3, removeS3Directories, uploadFavicon } from "~/lib/media"
import { adminProcedure } from "~/lib/safe-actions"
import { configSchema } from "~/server/admin/configs/schema"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

const findLinkedEntitySlugs = async (themeIds: string[], platformIds: string[]) => {
  const [themes, platforms] = await Promise.all([
    themeIds.length
      ? db.theme.findMany({
          where: { id: { in: themeIds } },
          select: { slug: true },
        })
      : Promise.resolve([]),
    platformIds.length
      ? db.platform.findMany({
          where: { id: { in: platformIds } },
          select: { slug: true },
        })
      : Promise.resolve([]),
  ])

  return {
    themeSlugs: themes.map(theme => theme.slug),
    platformSlugs: platforms.map(platform => platform.slug),
  }
}

export const upsertConfig = adminProcedure
  .createServerAction()
  .input(configSchema)
  .handler(async ({ input: { id, themeIds, platformIds, ...input } }) => {
    const slug = input.slug || slugify(input.name)
    const providedFaviconUrl = input.faviconUrl?.trim()
    const websiteUrl = input.websiteUrl?.trim()
    const repositoryUrl = input.repositoryUrl?.trim()
    const hostnameSource = websiteUrl || repositoryUrl

    const existingRelations = id
      ? await db.config.findUnique({
          where: { id },
          select: {
            slug: true,
            configThemes: { select: { theme: { select: { slug: true } } } },
            configPlatforms: { select: { platform: { select: { slug: true } } } },
          },
        })
      : null

    let faviconUrl: string | null = null

    if (providedFaviconUrl) {
      faviconUrl = await normalizeImageUrlToS3({
        imageUrl: providedFaviconUrl,
        s3Path: `configs/${slug}/favicon`,
      })
    } else if (hostnameSource) {
      faviconUrl =
        (await tryCatch(uploadFavicon(getUrlHostname(hostnameSource), `configs/${slug}`))).data ??
        null
    }

    const config = id
      ? await db.config.update({
          where: { id },
          data: { ...input, slug, faviconUrl },
        })
      : await db.config.create({
          data: { ...input, slug, faviconUrl },
        })

    await db.$transaction([
      db.configTheme.deleteMany({ where: { configId: config.id } }),
      db.configPlatform.deleteMany({ where: { configId: config.id } }),
      db.configTheme.createMany({
        data: themeIds.map((themeId, index) => ({
          configId: config.id,
          themeId,
          isPrimary: index === 0,
          order: index,
        })),
      }),
      db.configPlatform.createMany({
        data: platformIds.map((platformId, index) => ({
          configId: config.id,
          platformId,
          isPrimary: index === 0,
          order: index,
        })),
      }),
    ])

    const nextRelations = await findLinkedEntitySlugs(themeIds, platformIds)
    const themeSlugs = new Set([
      ...(existingRelations?.configThemes.map(entry => entry.theme.slug) ?? []),
      ...nextRelations.themeSlugs,
    ])
    const platformSlugs = new Set([
      ...(existingRelations?.configPlatforms.map(entry => entry.platform.slug) ?? []),
      ...nextRelations.platformSlugs,
    ])

    revalidatePath("/admin/configs")
    revalidateTag("configs", "max")
    revalidateTag(`config-${config.slug}`, "max")

    if (existingRelations?.slug && existingRelations.slug !== config.slug) {
      revalidateTag(`config-${existingRelations.slug}`, "max")
    }

    for (const themeSlug of themeSlugs) {
      revalidateTag(`theme-${themeSlug}`, "max")
    }

    for (const platformSlug of platformSlugs) {
      revalidateTag(`platform-${platformSlug}`, "max")
    }

    return config
  })

export const deleteConfigs = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    const configs = await db.config.findMany({
      where: { id: { in: ids } },
      select: {
        slug: true,
        configThemes: { select: { theme: { select: { slug: true } } } },
        configPlatforms: { select: { platform: { select: { slug: true } } } },
      },
    })

    await db.config.deleteMany({
      where: { id: { in: ids } },
    })

    revalidatePath("/admin/configs")
    revalidateTag("configs", "max")

    const themeSlugs = new Set(
      configs.flatMap(config => config.configThemes.map(entry => entry.theme.slug)),
    )
    const platformSlugs = new Set(
      configs.flatMap(config => config.configPlatforms.map(entry => entry.platform.slug)),
    )

    for (const config of configs) {
      revalidateTag(`config-${config.slug}`, "max")
    }

    for (const themeSlug of themeSlugs) {
      revalidateTag(`theme-${themeSlug}`, "max")
    }

    for (const platformSlug of platformSlugs) {
      revalidateTag(`platform-${platformSlug}`, "max")
    }

    after(async () => {
      await removeS3Directories(configs.map(config => `configs/${config.slug}`))
    })

    return true
  })
