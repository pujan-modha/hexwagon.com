"use server"

import { revalidateTag } from "next/cache"
import { z } from "zod"
import { notifyEditorOfPortEditApproved, notifyEditorOfPortEditRejected } from "~/lib/notifications"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

export const approvePortEdit = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input: { id } }) => {
    const portEdit = await db.portEdit.findUniqueOrThrow({
      where: { id },
      include: { port: true, editor: true },
    })

    // Apply the diff to the port
    const diff = portEdit.diff as Record<string, unknown>
    await db.port.update({
      where: { id: portEdit.portId },
      data: diff,
    })

    // Mark the edit as approved
    await db.portEdit.update({
      where: { id },
      data: { status: "Approved" },
    })

    revalidateTag("ports", "max")
    revalidateTag(`port-${portEdit.port.slug}`, "max")

    await notifyEditorOfPortEditApproved(portEdit)

    return portEdit
  })

export const rejectPortEdit = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string(), adminNote: z.string().optional() }))
  .handler(async ({ input: { id, adminNote } }) => {
    const portEdit = await db.portEdit.update({
      where: { id },
      data: { status: "Rejected", adminNote },
      include: { editor: true, port: true },
    })

    revalidateTag("port-edits", "max")

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
