"use server"

import { getUrlHostname } from "@primoui/utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { normalizeImageUrlToS3, uploadFavicon } from "~/lib/media"
import { userProcedure } from "~/lib/safe-actions"
import { themePaletteSchema } from "~/server/admin/themes/schema"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

const updateMaintainedThemeSchema = z.object({
  themeId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
  repositoryUrl: z.string().trim().url().optional().or(z.literal("")),
  faviconUrl: z.string().trim().url().optional().or(z.literal("")),
  guidelines: z.string().trim().max(50_000).optional().or(z.literal("")),
  license: z.string().trim().max(120).optional().or(z.literal("")),
  palettes: z.array(themePaletteSchema).optional(),
})

const toNullableString = (value?: string) => {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const updateMaintainedTheme = userProcedure
  .createServerAction()
  .input(updateMaintainedThemeSchema)
  .handler(async ({ input, ctx: { user } }) => {
    const {
      themeId,
      name,
      description,
      websiteUrl,
      repositoryUrl,
      faviconUrl,
      guidelines,
      license,
      palettes,
    } = input

    if (user.role !== "admin") {
      const isMaintainer = await db.themeMaintainer.findUnique({
        where: {
          userId_themeId: {
            userId: user.id,
            themeId,
          },
        },
        select: { id: true },
      })

      if (!isMaintainer) {
        throw new Error("Only maintainers of this theme can edit it.")
      }
    }

    const slugCandidate =
      (
        await db.theme.findUnique({
          where: { id: themeId },
          select: { slug: true },
        })
      )?.slug ?? name.trim().toLowerCase().replace(/\s+/g, "-")

    const providedFaviconUrl = faviconUrl?.trim()
    const website = websiteUrl?.trim()

    let resolvedFaviconUrl: string | null = null

    if (providedFaviconUrl) {
      resolvedFaviconUrl = await normalizeImageUrlToS3({
        imageUrl: providedFaviconUrl,
        s3Path: `themes/${slugCandidate}/favicon`,
      })
    } else if (website) {
      resolvedFaviconUrl =
        (await tryCatch(uploadFavicon(getUrlHostname(website), `themes/${slugCandidate}`))).data ??
        null
    }

    const theme = await db.theme.update({
      where: { id: themeId },
      data: {
        name: name.trim(),
        description: toNullableString(description),
        websiteUrl: toNullableString(websiteUrl),
        repositoryUrl: toNullableString(repositoryUrl),
        faviconUrl: resolvedFaviconUrl,
        guidelines: toNullableString(guidelines),
        license: toNullableString(license),
      },
      select: { slug: true },
    })

    if (palettes !== undefined) {
      const flatColors = palettes.flatMap(palette =>
        palette.colors.map((color, index) => ({
          themeId,
          paletteName: palette.name,
          label: color.label,
          hex: color.hex,
          order: color.order ?? index,
        })),
      )

      await db.$transaction([
        db.colorPalette.deleteMany({ where: { themeId } }),
        db.colorPalette.createMany({ data: flatColors }),
      ])
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/maintainer")
    revalidatePath(`/themes/${theme.slug}`)
    revalidateTag("themes", "max")
    revalidateTag(`theme-${theme.slug}`, "max")

    return { success: true }
  })
