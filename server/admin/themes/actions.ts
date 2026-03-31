"use server"

import { slugify } from "@primoui/utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { removeS3Directories } from "~/lib/media"
import { adminProcedure } from "~/lib/safe-actions"
import { themeSchema } from "~/server/admin/themes/schema"
import { db } from "~/services/db"

// --- Color Palette Actions ---

const colorPaletteEntrySchema = z.object({
  id: z.string().optional(),
  themeId: z.string(),
  label: z.string().min(1, "Label is required"),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  order: z.number().int().default(0),
})

export const upsertColorPaletteEntry = adminProcedure
  .createServerAction()
  .input(colorPaletteEntrySchema)
  .handler(async ({ input: { id, ...input } }) => {
    const entry = id
      ? await db.colorPalette.update({ where: { id }, data: input })
      : await db.colorPalette.create({ data: input })

    revalidateTag(`theme-${(await db.theme.findUnique({ where: { id: input.themeId }, select: { slug: true } }))?.slug}`, "max")
    return entry
  })

export const deleteColorPaletteEntry = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string(), themeSlug: z.string() }))
  .handler(async ({ input: { id, themeSlug } }) => {
    await db.colorPalette.delete({ where: { id } })
    revalidateTag(`theme-${themeSlug}`, "max")
    return true
  })

export const reorderColorPaletteEntries = adminProcedure
  .createServerAction()
  .input(z.object({ entries: z.array(z.object({ id: z.string(), order: z.number().int() })), themeSlug: z.string() }))
  .handler(async ({ input: { entries, themeSlug } }) => {
    await db.$transaction(
      entries.map(({ id, order }) => db.colorPalette.update({ where: { id }, data: { order } })),
    )
    revalidateTag(`theme-${themeSlug}`, "max")
    return true
  })

export const upsertTheme = adminProcedure
  .createServerAction()
  .input(themeSchema)
  .handler(async ({ input: { id, palettes, ...input } }) => {
    const slug = input.slug || slugify(input.name)

    const theme = id
      ? await db.theme.update({
          where: { id },
          data: { ...input, slug },
        })
      : await db.theme.create({
          data: { ...input, slug },
        })

    // Replace color palette entries if provided
    if (palettes !== undefined) {
      const flatColors = palettes.flatMap(p => 
        p.colors.map((c, i) => ({
          themeId: theme.id,
          paletteName: p.name,
          label: c.label,
          hex: c.hex,
          order: c.order ?? i,
        }))
      )

      await db.$transaction([
        db.colorPalette.deleteMany({ where: { themeId: theme.id } }),
        db.colorPalette.createMany({ data: flatColors }),
      ])
    }

    revalidateTag("themes", "max")
    revalidateTag(`theme-${theme.slug}`, "max")

    return theme
  })

export const deleteThemes = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    const themes = await db.theme.findMany({
      where: { id: { in: ids } },
      select: { slug: true },
    })

    await db.theme.deleteMany({
      where: { id: { in: ids } },
    })

    revalidatePath("/admin/themes")
    revalidateTag("themes", "max")

    after(async () => {
      await removeS3Directories(themes.map(theme => `themes/${theme.slug}`))
    })

    return true
  })

export const assignThemeMaintainer = adminProcedure
  .createServerAction()
  .input(z.object({ themeId: z.string(), email: z.string().email() }))
  .handler(async ({ input: { themeId, email } }) => {
    const [theme, user] = await Promise.all([
      db.theme.findUnique({ where: { id: themeId }, select: { slug: true } }),
      db.user.findUnique({ where: { email }, select: { id: true } }),
    ])

    if (!theme) {
      throw new Error("Theme not found")
    }

    if (!user) {
      throw new Error("User with this email does not exist")
    }

    await db.themeMaintainer.upsert({
      where: {
        userId_themeId: {
          userId: user.id,
          themeId,
        },
      },
      create: {
        userId: user.id,
        themeId,
      },
      update: {},
    })

    revalidatePath(`/admin/themes/${theme.slug}`)
    revalidateTag(`theme-${theme.slug}`, "max")

    return { success: true }
  })

export const removeThemeMaintainer = adminProcedure
  .createServerAction()
  .input(z.object({ themeId: z.string(), userId: z.string() }))
  .handler(async ({ input: { themeId, userId } }) => {
    const theme = await db.theme.findUnique({
      where: { id: themeId },
      select: { slug: true },
    })

    if (!theme) {
      throw new Error("Theme not found")
    }

    await db.themeMaintainer.deleteMany({
      where: { themeId, userId },
    })

    revalidatePath(`/admin/themes/${theme.slug}`)
    revalidateTag(`theme-${theme.slug}`, "max")

    return { success: true }
  })
