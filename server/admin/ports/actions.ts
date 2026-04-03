"use server"

import { getUrlHostname, slugify } from "@primoui/utils"
import { PortStatus } from "@prisma/client"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { normalizeImageUrlToS3, removeS3Directories, uploadFavicon } from "~/lib/media"
import { notifySubmitterOfPortApproved, notifySubmitterOfPortRejected } from "~/lib/notifications"
import { adminProcedure, userProcedure } from "~/lib/safe-actions"
import { portSchema } from "~/server/admin/ports/schema"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

export const upsertPort = adminProcedure
  .createServerAction()
  .input(portSchema)
  .handler(async ({ input: { id, themeId, platformId, ...input } }) => {
    const slug = input.slug || slugify(input.name ?? `${themeId}-${platformId}`)
    const providedFaviconUrl = input.faviconUrl?.trim()
    const providedScreenshotUrl = input.screenshotUrl?.trim()
    const repositoryUrl = input.repositoryUrl?.trim()

    let faviconUrl: string | null = null
    if (providedFaviconUrl) {
      faviconUrl = await normalizeImageUrlToS3({
        imageUrl: providedFaviconUrl,
        s3Path: `ports/${slug}/favicon`,
      })
    } else if (repositoryUrl) {
      faviconUrl =
        (await tryCatch(uploadFavicon(getUrlHostname(repositoryUrl), `ports/${slug}`))).data ?? null
    }

    const screenshotUrl = providedScreenshotUrl
      ? await normalizeImageUrlToS3({
          imageUrl: providedScreenshotUrl,
          s3Path: `ports/${slug}/screenshot`,
        })
      : null

    const status = input.status === PortStatus.Scheduled ? PortStatus.Published : input.status
    const publishedAt = status === PortStatus.Published ? (input.publishedAt ?? new Date()) : null

    const existingPort = id ? await db.port.findUnique({ where: { id } }) : null

    const port = id
      ? await db.port.update({
          where: { id },
          data: {
            ...input,
            status,
            publishedAt,
            slug,
            themeId: themeId ?? existingPort?.themeId,
            platformId: platformId ?? existingPort?.platformId,
            faviconUrl,
            screenshotUrl,
          },
        })
      : await db.port.create({
          data: {
            ...input,
            status,
            publishedAt,
            slug,
            themeId: themeId!,
            platformId: platformId!,
            faviconUrl,
            screenshotUrl,
          },
        })

    revalidateTag("ports", "max")
    revalidateTag(`port-${port.slug}`, "max")

    if (!existingPort || existingPort.status !== port.status) {
      after(async () => await notifySubmitterOfPortApproved(port))
    }

    const hasRejectionReason = Boolean(port.rejectionReason?.trim())
    const hadRejectionReason = Boolean(existingPort?.rejectionReason?.trim())
    const rejectionReasonChanged =
      (existingPort?.rejectionReason ?? "") !== (port.rejectionReason ?? "")
    const isRejectedState = port.status !== PortStatus.Published

    if (
      existingPort &&
      isRejectedState &&
      hasRejectionReason &&
      (!hadRejectionReason || rejectionReasonChanged)
    ) {
      after(async () => await notifySubmitterOfPortRejected(port))
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

export const setOfficialPort = userProcedure
  .createServerAction()
  .input(z.object({ portId: z.string() }))
  .handler(async ({ input: { portId }, ctx: { user } }) => {
    const port = await db.port.findUniqueOrThrow({
      where: { id: portId },
      select: { themeId: true, platformId: true, slug: true },
    })

    if (user.role !== "admin") {
      const isThemeMaintainer = await db.themeMaintainer.findUnique({
        where: {
          userId_themeId: {
            userId: user.id,
            themeId: port.themeId,
          },
        },
        select: { id: true },
      })

      if (!isThemeMaintainer) {
        throw new Error("Only admins or maintainers of this theme can mark official ports")
      }
    }

    await db.port.updateMany({
      where: {
        themeId: port.themeId,
        platformId: port.platformId,
        isOfficial: true,
      },
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

export const unsetOfficialPort = userProcedure
  .createServerAction()
  .input(z.object({ portId: z.string() }))
  .handler(async ({ input: { portId }, ctx: { user } }) => {
    const port = await db.port.findUniqueOrThrow({
      where: { id: portId },
      select: { themeId: true, platformId: true, slug: true, isOfficial: true },
    })

    if (user.role !== "admin") {
      const isThemeMaintainer = await db.themeMaintainer.findUnique({
        where: {
          userId_themeId: {
            userId: user.id,
            themeId: port.themeId,
          },
        },
        select: { id: true },
      })

      if (!isThemeMaintainer) {
        throw new Error("Only admins or maintainers of this theme can unmark official ports")
      }
    }

    if (!port.isOfficial) {
      return port
    }

    const updatedPort = await db.port.update({
      where: { id: portId },
      data: { isOfficial: false },
    })

    revalidateTag("ports", "max")
    revalidateTag(`port-${updatedPort.slug}`, "max")

    return updatedPort
  })
