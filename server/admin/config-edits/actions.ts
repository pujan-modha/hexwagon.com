"use server"

import { EditStatus, type Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { adminProcedure } from "~/lib/safe-actions"
import { editableConfigDiffSchema } from "~/server/web/configs/edit-schema"
import { db } from "~/services/db"

const normalizeNullableString = (value?: string | null) => {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

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

export const approveConfigEdit = adminProcedure
  .createServerAction()
  .input(z.object({ configEditId: z.string().min(1) }))
  .handler(async ({ input: { configEditId } }) => {
    const configEdit = await db.configEdit.findUniqueOrThrow({
      where: { id: configEditId },
      include: {
        config: {
          select: {
            id: true,
            slug: true,
            configThemes: { select: { theme: { select: { slug: true } } } },
            configPlatforms: { select: { platform: { select: { slug: true } } } },
          },
        },
        editor: { select: { email: true } },
      },
    })

    if (configEdit.status !== EditStatus.Pending) {
      throw new Error("This config edit has already been reviewed.")
    }

    const parsedDiff = editableConfigDiffSchema.parse(configEdit.diff)

    await db.$transaction(async tx => {
      const data: Prisma.ConfigUpdateInput = {
        ...(parsedDiff.name !== undefined ? { name: parsedDiff.name } : {}),
        ...(parsedDiff.description !== undefined
          ? { description: normalizeNullableString(parsedDiff.description) }
          : {}),
        ...(parsedDiff.content !== undefined
          ? { content: normalizeNullableString(parsedDiff.content) }
          : {}),
        ...(parsedDiff.repositoryUrl !== undefined
          ? { repositoryUrl: normalizeNullableString(parsedDiff.repositoryUrl) }
          : {}),
        ...(parsedDiff.license !== undefined
          ? { license: normalizeNullableString(parsedDiff.license) }
          : {}),
        ...(parsedDiff.fonts !== undefined
          ? { fonts: parsedDiff.fonts as Prisma.InputJsonValue }
          : {}),
        ...(parsedDiff.screenshots !== undefined
          ? {
              screenshots: parsedDiff.screenshots as Prisma.InputJsonValue,
              screenshotUrl: parsedDiff.screenshots[0] ?? null,
            }
          : {}),
      }

      await tx.config.update({
        where: { id: configEdit.configId },
        data,
      })

      if (parsedDiff.themeIds !== undefined) {
        await tx.configTheme.deleteMany({ where: { configId: configEdit.configId } })
        await tx.configTheme.createMany({
          data: parsedDiff.themeIds.map((themeId, index) => ({
            configId: configEdit.configId,
            themeId,
            isPrimary: index === 0,
            order: index,
          })),
        })
      }

      if (parsedDiff.platformIds !== undefined) {
        await tx.configPlatform.deleteMany({ where: { configId: configEdit.configId } })
        await tx.configPlatform.createMany({
          data: parsedDiff.platformIds.map((platformId, index) => ({
            configId: configEdit.configId,
            platformId,
            isPrimary: index === 0,
            order: index,
          })),
        })
      }

      await tx.configEdit.update({
        where: { id: configEditId },
        data: { status: EditStatus.Approved },
      })
    })

    const nextRelations = await findLinkedEntitySlugs(
      parsedDiff.themeIds ?? [],
      parsedDiff.platformIds ?? [],
    )
    const themeSlugs = new Set([
      ...configEdit.config.configThemes.map(entry => entry.theme.slug),
      ...nextRelations.themeSlugs,
    ])
    const platformSlugs = new Set([
      ...configEdit.config.configPlatforms.map(entry => entry.platform.slug),
      ...nextRelations.platformSlugs,
    ])

    revalidateTag("configs", "max")
    revalidateTag("config-edits", "max")
    revalidateTag(`config-${configEdit.config.slug}`, "max")

    for (const themeSlug of themeSlugs) {
      revalidateTag(`theme-${themeSlug}`, "max")
    }

    for (const platformSlug of platformSlugs) {
      revalidateTag(`platform-${platformSlug}`, "max")
    }

    return configEdit
  })

export const rejectConfigEdit = adminProcedure
  .createServerAction()
  .input(
    z.object({
      configEditId: z.string().min(1),
      reason: z.string().trim().min(1).max(500),
    }),
  )
  .handler(async ({ input: { configEditId, reason } }) => {
    const configEdit = await db.configEdit.findUniqueOrThrow({
      where: { id: configEditId },
      include: {
        config: {
          select: {
            slug: true,
          },
        },
      },
    })

    if (configEdit.status !== EditStatus.Pending) {
      throw new Error("This config edit has already been reviewed.")
    }

    await db.configEdit.update({
      where: { id: configEditId },
      data: {
        status: EditStatus.Rejected,
        adminNote: reason,
      },
    })

    revalidateTag("config-edits", "max")
    revalidateTag(`config-${configEdit.config.slug}`, "max")

    return configEdit
  })
