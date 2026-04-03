"use server"

import type { Prisma } from "@prisma/client"
import { EditStatus, PortStatus } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { notifyEditorOfPortEditApproved } from "~/lib/notifications"
import { userProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

const editableDiffSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    content: z.string().trim().max(50_000).nullable().optional(),
    repositoryUrl: z.string().trim().url().nullable().optional(),
    license: z.string().trim().max(120).nullable().optional(),
  })
  .refine(diff => Object.keys(diff).length > 0, {
    message: "Please change at least one field before submitting.",
  })

const portEditSchema = z.object({
  portId: z.string().min(1),
  diff: editableDiffSchema,
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

export const submitPortEdit = userProcedure
  .createServerAction()
  .input(portEditSchema)
  .handler(async ({ input: { portId, diff }, ctx: { user } }) => {
    const port = await db.port.findUniqueOrThrow({
      where: { id: portId },
      select: {
        id: true,
        slug: true,
        themeId: true,
        status: true,
        publishedAt: true,
        authorId: true,
        submitterEmail: true,
        name: true,
        description: true,
        content: true,
        repositoryUrl: true,
        license: true,
      },
    })

    const userEmail = user.email?.toLowerCase() ?? ""
    const submitterEmail = port.submitterEmail?.toLowerCase() ?? ""
    const isAuthor = port.authorId === user.id
    const isSubmitterByEmail = userEmail.length > 0 && submitterEmail === userEmail
    const isThemeMaintainer =
      user.role === "admin" ||
      Boolean(
        await db.themeMaintainer.findUnique({
          where: {
            userId_themeId: {
              userId: user.id,
              themeId: port.themeId,
            },
          },
          select: { id: true },
        }),
      )

    if (!isAuthor && !isSubmitterByEmail && !isThemeMaintainer) {
      throw new Error("You can only edit ports you submitted or maintain.")
    }

    const normalizedDiff = {
      name: diff.name?.trim(),
      description: normalizeNullableString(diff.description),
      content: normalizeNullableString(diff.content),
      repositoryUrl: normalizeNullableString(diff.repositoryUrl),
      license: normalizeNullableString(diff.license),
    }

    const changedDiff: Record<string, string | null> = {}

    if (normalizedDiff.name !== undefined && normalizedDiff.name !== (port.name ?? undefined)) {
      changedDiff.name = normalizedDiff.name
    }

    if (
      normalizedDiff.description !== undefined &&
      normalizedDiff.description !== port.description
    ) {
      changedDiff.description = normalizedDiff.description
    }

    if (normalizedDiff.content !== undefined && normalizedDiff.content !== port.content) {
      changedDiff.content = normalizedDiff.content
    }

    if (
      normalizedDiff.repositoryUrl !== undefined &&
      normalizedDiff.repositoryUrl !== port.repositoryUrl
    ) {
      changedDiff.repositoryUrl = normalizedDiff.repositoryUrl
    }

    if (normalizedDiff.license !== undefined && normalizedDiff.license !== port.license) {
      changedDiff.license = normalizedDiff.license
    }

    if (Object.keys(changedDiff).length === 0) {
      throw new Error("No changes detected. Update at least one field.")
    }

    const result = await db.$transaction(async tx => {
      if (!port.authorId && isSubmitterByEmail) {
        await tx.port.update({
          where: { id: port.id },
          data: { authorId: user.id },
        })
      }

      if (isThemeMaintainer) {
        const directUpdate: Prisma.PortUpdateInput = {
          ...(changedDiff.name !== undefined ? { name: changedDiff.name } : {}),
          ...(changedDiff.description !== undefined
            ? { description: changedDiff.description }
            : {}),
          ...(changedDiff.content !== undefined ? { content: changedDiff.content } : {}),
          ...(changedDiff.repositoryUrl !== undefined
            ? { repositoryUrl: changedDiff.repositoryUrl }
            : {}),
          ...(changedDiff.license !== undefined ? { license: changedDiff.license } : {}),
          ...(port.status === PortStatus.PendingEdit
            ? {
                status: PortStatus.Published,
                publishedAt: port.publishedAt ?? new Date(),
              }
            : {}),
        }

        await tx.port.update({
          where: { id: port.id },
          data: directUpdate,
        })

        const approvedEdit = await tx.portEdit.create({
          data: {
            portId,
            editorId: user.id,
            diff: changedDiff as Prisma.InputJsonValue,
            status: EditStatus.Approved,
            adminNote: "Auto-approved for theme maintainer.",
          },
          include: {
            editor: { select: { email: true } },
            port: { select: { name: true } },
          },
        })

        return { portEdit: approvedEdit, appliedDirectly: true as const }
      }

      await tx.portEdit.deleteMany({
        where: {
          portId,
          editorId: user.id,
          status: EditStatus.Pending,
        },
      })

      const pendingEdit = await tx.portEdit.create({
        data: {
          portId,
          editorId: user.id,
          diff: changedDiff as Prisma.InputJsonValue,
        },
      })

      return { portEdit: pendingEdit, appliedDirectly: false as const }
    })

    if (result.appliedDirectly) {
      revalidateTag("ports", "max")
      revalidateTag("port-edits", "max")
      revalidateTag(`port-${port.slug}`, "max")
      await notifyEditorOfPortEditApproved(result.portEdit)
    }

    return result
  })
