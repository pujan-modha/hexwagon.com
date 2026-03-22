"use server"

import { slugify } from "@primoui/utils"
import { PortStatus } from "@prisma/client"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { removeS3Directories } from "~/lib/media"
import { notifySubmitterOfPortApproved, notifySubmitterOfPortScheduled } from "~/lib/notifications"
import { getPortRepositoryData } from "~/lib/repositories"
import { adminProcedure } from "~/lib/safe-actions"
import { portSchema } from "~/server/admin/ports/schema"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

export const upsertPort = adminProcedure
  .createServerAction()
  .input(portSchema)
  .handler(async ({ input: { id, themeId, platformId, notifySubmitter, ...input } }) => {
    const existingPort = id ? await db.port.findUnique({ where: { id } }) : null

    const port = id
      ? await db.port.update({
          where: { id },
          data: {
            ...input,
            slug: input.slug || slugify(input.name ?? `${themeId}-${platformId}`),
            themeId: themeId ?? existingPort?.themeId,
            platformId: platformId ?? existingPort?.platformId,
          },
        })
      : await db.port.create({
          data: {
            ...input,
            slug: input.slug || slugify(input.name ?? `${themeId}-${platformId}`),
            themeId: themeId!,
            platformId: platformId!,
          },
        })

    revalidateTag("ports", "max")
    revalidateTag(`port-${port.slug}`, "max")

    if (port.status === PortStatus.Scheduled) {
      revalidateTag("schedule", "max")
    }

    if (notifySubmitter && (!existingPort || existingPort.status !== port.status)) {
      after(async () => await notifySubmitterOfPortApproved(port))
      after(async () => await notifySubmitterOfPortScheduled(port))
    }

    return port
  })

export const deletePorts = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    const ports = await db.port.findMany({
      where: { id: { in: ids } },
      select: { slug: true },
    })

    await db.port.deleteMany({
      where: { id: { in: ids } },
    })

    revalidatePath("/admin/ports")
    revalidateTag("ports", "max")

    after(async () => {
      await removeS3Directories(ports.map(port => `ports/${port.slug}`))
    })

    return true
  })

export const fetchPortRepositoryData = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input: { id } }) => {
    const port = await db.port.findUniqueOrThrow({ where: { id } })

    if (!port.repositoryUrl) {
      return null
    }

    const result = await tryCatch(getPortRepositoryData(port.repositoryUrl))

    if (result.error) {
      console.error(`Failed to fetch repository data for ${port.name}`, {
        error: result.error,
        slug: port.slug,
      })

      return null
    }

    if (!result.data) {
      return null
    }

    await db.port.update({
      where: { id: port.id },
      data: result.data,
    })

    revalidateTag("ports", "max")
    revalidateTag(`port-${port.slug}`, "max")
  })

export const setOfficialPort = adminProcedure
  .createServerAction()
  .input(z.object({ portId: z.string() }))
  .handler(async ({ input: { portId } }) => {
    const port = await db.port.findUniqueOrThrow({
      where: { id: portId },
      select: { themeId: true, platformId: true },
    })

    await db.port.updateMany({
      where: { themeId: port.themeId, platformId: port.platformId, isOfficial: true },
      data: { isOfficial: false },
    })

    const updatedPort = await db.port.update({
      where: { id: portId },
      data: { isOfficial: true },
    })

    revalidateTag("ports", "max")
    revalidateTag(`port-${updatedPort.slug}`, "max")

    return updatedPort
  })
