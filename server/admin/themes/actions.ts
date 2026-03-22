"use server"

import { slugify } from "@primoui/utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { removeS3Directories } from "~/lib/media"
import { adminProcedure } from "~/lib/safe-actions"
import { themeSchema } from "~/server/admin/themes/schema"
import { db } from "~/services/db"

export const upsertTheme = adminProcedure
  .createServerAction()
  .input(themeSchema)
  .handler(async ({ input: { id, ...input } }) => {
    const theme = id
      ? await db.theme.update({
          where: { id },
          data: { ...input, slug: input.slug || slugify(input.name) },
        })
      : await db.theme.create({
          data: { ...input, slug: input.slug || slugify(input.name) },
        })

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

export const setOfficialPort = adminProcedure
  .createServerAction()
  .input(z.object({ portId: z.string() }))
  .handler(async ({ input: { portId } }) => {
    const port = await db.port.findUniqueOrThrow({
      where: { id: portId },
      select: { themeId: true, platformId: true },
    })

    // Clear existing official port for same theme+platform
    await db.port.updateMany({
      where: { themeId: port.themeId, platformId: port.platformId, isOfficial: true },
      data: { isOfficial: false },
    })

    // Set new official port
    const updatedPort = await db.port.update({
      where: { id: portId },
      data: { isOfficial: true },
    })

    revalidateTag("ports", "max")
    revalidateTag(`port-${updatedPort.slug}`, "max")

    return updatedPort
  })
