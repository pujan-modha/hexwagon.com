"use server"

import type { Prisma } from "@prisma/client"
import { EditStatus } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { parseConfigFonts, parseConfigScreenshots } from "~/lib/configs"
import { userProcedure } from "~/lib/safe-actions"
import { editableConfigDiffSchema } from "~/server/web/configs/edit-schema"
import { db } from "~/services/db"

const configEditSchema = z.object({
  configId: z.string().min(1),
  diff: editableConfigDiffSchema,
})

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

const normalizeIdList = (value?: string[]) => {
  if (!value) {
    return undefined
  }

  return Array.from(new Set(value.map(item => item.trim()).filter(Boolean)))
}

const areListsEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

const areJsonArraysEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right)

export const submitConfigEdit = userProcedure
  .createServerAction()
  .input(configEditSchema)
  .handler(async ({ input: { configId, diff }, ctx: { user } }) => {
    const config = await db.config.findUniqueOrThrow({
      where: { id: configId },
      select: {
        id: true,
        slug: true,
        authorId: true,
        name: true,
        description: true,
        content: true,
        repositoryUrl: true,
        license: true,
        fonts: true,
        screenshots: true,
        configThemes: {
          select: { themeId: true },
          orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { theme: { name: "asc" } }],
        },
        configPlatforms: {
          select: { platformId: true },
          orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { platform: { name: "asc" } }],
        },
      },
    })

    if (user.role !== "admin" && config.authorId !== user.id) {
      throw new Error("You can only edit configs you submitted.")
    }

    const normalizedDiff = {
      name: diff.name?.trim(),
      description: normalizeNullableString(diff.description),
      content: normalizeNullableString(diff.content),
      repositoryUrl: normalizeNullableString(diff.repositoryUrl),
      license: normalizeNullableString(diff.license),
      themeIds: normalizeIdList(diff.themeIds),
      themeNames: diff.themeNames?.map(item => item.trim()).filter(Boolean),
      platformIds: normalizeIdList(diff.platformIds),
      platformNames: diff.platformNames?.map(item => item.trim()).filter(Boolean),
      fonts: diff.fonts ? parseConfigFonts(diff.fonts) : undefined,
      screenshots: diff.screenshots ? parseConfigScreenshots(diff.screenshots) : undefined,
    }

    const currentThemeIds = config.configThemes.map(entry => entry.themeId)
    const currentPlatformIds = config.configPlatforms.map(entry => entry.platformId)
    const currentFonts = parseConfigFonts(config.fonts)
    const currentScreenshots = parseConfigScreenshots(config.screenshots)

    const changedDiff: Record<string, string | null | string[] | Prisma.InputJsonValue> = {}

    if (normalizedDiff.name !== undefined && normalizedDiff.name !== config.name) {
      changedDiff.name = normalizedDiff.name
    }

    if (
      normalizedDiff.description !== undefined &&
      normalizedDiff.description !== config.description
    ) {
      changedDiff.description = normalizedDiff.description
    }

    if (normalizedDiff.content !== undefined && normalizedDiff.content !== config.content) {
      changedDiff.content = normalizedDiff.content
    }

    if (
      normalizedDiff.repositoryUrl !== undefined &&
      normalizedDiff.repositoryUrl !== config.repositoryUrl
    ) {
      changedDiff.repositoryUrl = normalizedDiff.repositoryUrl
    }

    if (normalizedDiff.license !== undefined && normalizedDiff.license !== config.license) {
      changedDiff.license = normalizedDiff.license
    }

    if (
      normalizedDiff.themeIds !== undefined &&
      !areListsEqual(normalizedDiff.themeIds, currentThemeIds)
    ) {
      changedDiff.themeIds = normalizedDiff.themeIds
      if (normalizedDiff.themeNames?.length) {
        changedDiff.themeNames = normalizedDiff.themeNames
      }
    }

    if (
      normalizedDiff.platformIds !== undefined &&
      !areListsEqual(normalizedDiff.platformIds, currentPlatformIds)
    ) {
      changedDiff.platformIds = normalizedDiff.platformIds
      if (normalizedDiff.platformNames?.length) {
        changedDiff.platformNames = normalizedDiff.platformNames
      }
    }

    if (
      normalizedDiff.fonts !== undefined &&
      !areJsonArraysEqual(normalizedDiff.fonts, currentFonts)
    ) {
      changedDiff.fonts = normalizedDiff.fonts as Prisma.InputJsonValue
    }

    if (
      normalizedDiff.screenshots !== undefined &&
      !areJsonArraysEqual(normalizedDiff.screenshots, currentScreenshots)
    ) {
      changedDiff.screenshots = normalizedDiff.screenshots as Prisma.InputJsonValue
    }

    if (Object.keys(changedDiff).length === 0) {
      throw new Error("No changes detected. Update at least one field.")
    }

    const configEdit = await db.$transaction(async tx => {
      await tx.configEdit.deleteMany({
        where: {
          configId,
          editorId: user.id,
          status: EditStatus.Pending,
        },
      })

      return tx.configEdit.create({
        data: {
          configId,
          editorId: user.id,
          diff: changedDiff as Prisma.InputJsonValue,
        },
      })
    })

    revalidateTag("config-edits", "max")

    return { configEdit, appliedDirectly: false as const }
  })
