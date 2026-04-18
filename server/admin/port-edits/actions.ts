"use server"

import { EditStatus, PortStatus, type Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { notifyEditorOfPortEditApproved, notifyEditorOfPortEditRejected } from "~/lib/notifications"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

const editableDiffSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    content: z.string().trim().max(50_000).nullable().optional(),
    repositoryUrl: z.string().trim().url().nullable().optional(),
    license: z.string().trim().max(120).nullable().optional(),
  })
  .partial()

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

export const approvePortEdit = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input: { id } }) => {
    const portEdit = await db.portEdit.findUniqueOrThrow({
      where: { id },
      include: { port: true, editor: true },
    })

    if (portEdit.status !== EditStatus.Pending) {
      throw new Error("This edit has already been reviewed.")
    }

    const parsedDiff = editableDiffSchema.parse(portEdit.diff)
    const data: Prisma.PortUpdateInput = {}

    if (parsedDiff.name !== undefined) {
      data.name = parsedDiff.name
    }

    if (parsedDiff.description !== undefined) {
      data.description = normalizeNullableString(parsedDiff.description)
    }

    if (parsedDiff.content !== undefined) {
      data.content = normalizeNullableString(parsedDiff.content)
    }

    if (parsedDiff.repositoryUrl !== undefined) {
      data.repositoryUrl = normalizeNullableString(parsedDiff.repositoryUrl)
    }

    if (parsedDiff.license !== undefined) {
      data.license = normalizeNullableString(parsedDiff.license)
    }

    await db.$transaction(async tx => {
      await tx.port.update({
        where: { id: portEdit.portId },
        data,
      })

      await tx.portEdit.update({
        where: { id },
        data: { status: EditStatus.Approved },
      })

      if (portEdit.port.status === PortStatus.PendingEdit) {
        await tx.port.update({
          where: { id: portEdit.portId },
          data: {
            status: PortStatus.Published,
            publishedAt: portEdit.port.publishedAt ?? new Date(),
          },
        })
      }
    })

    revalidateTag("ports", "max")
    revalidateTag("port-edits", "max")
    revalidateTag(`port-${portEdit.port.slug}`, "max")

    await notifyEditorOfPortEditApproved(portEdit)

    return portEdit
  })

export const rejectPortEdit = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string(), adminNote: z.string().optional() }))
  .handler(async ({ input: { id, adminNote } }) => {
    const portEdit = await db.portEdit.findUniqueOrThrow({
      where: { id },
      include: { editor: true, port: true },
    })

    if (portEdit.status !== EditStatus.Pending) {
      throw new Error("This edit has already been reviewed.")
    }

    await db.$transaction(async tx => {
      await tx.portEdit.update({
        where: { id },
        data: {
          status: EditStatus.Rejected,
          adminNote,
        },
      })

      if (portEdit.port.status === PortStatus.PendingEdit) {
        await tx.port.update({
          where: { id: portEdit.portId },
          data: {
            status: portEdit.port.publishedAt ? PortStatus.Published : PortStatus.Draft,
          },
        })
      }
    })

    revalidateTag("ports", "max")
    revalidateTag("port-edits", "max")
    revalidateTag(`port-${portEdit.port.slug}`, "max")

    await notifyEditorOfPortEditRejected(portEdit)

    return portEdit
  })

export const deletePortEdits = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    await db.portEdit.deleteMany({
      where: { id: { in: ids } },
    })

    revalidateTag("port-edits", "max")

    return true
  })
