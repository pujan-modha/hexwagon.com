"use server"

import { slugify } from "@primoui/utils"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { removeS3Directories } from "~/lib/media"
import { adminProcedure } from "~/lib/safe-actions"
import { platformSchema } from "~/server/admin/platforms/schema"
import { db } from "~/services/db"

export const upsertPlatform = adminProcedure
  .createServerAction()
  .input(platformSchema)
  .handler(async ({ input: { id, ...input } }) => {
    const platform = id
      ? await db.platform.update({
          where: { id },
          data: { ...input, slug: input.slug || slugify(input.name) },
        })
      : await db.platform.create({
          data: { ...input, slug: input.slug || slugify(input.name) },
        })

    revalidateTag("platforms", "max")
    revalidateTag(`platform-${platform.slug}`, "max")

    return platform
  })

export const deletePlatforms = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    const platforms = await db.platform.findMany({
      where: { id: { in: ids } },
      select: { slug: true },
    })

    await db.platform.deleteMany({
      where: { id: { in: ids } },
    })

    revalidatePath("/admin/platforms")
    revalidateTag("platforms", "max")

    after(async () => {
      await removeS3Directories(platforms.map(platform => `platforms/${platform.slug}`))
    })

    return true
  })
