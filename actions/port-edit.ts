"use server"

import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { userProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

const portEditSchema = z.object({
  portId: z.string().min(1),
  diff: z.record(z.unknown()),
})

export const submitPortEdit = userProcedure
  .createServerAction()
  .input(portEditSchema)
  .handler(async ({ input: { portId, diff }, ctx: { user } }) => {
    // Verify the user is the author of the port
    const port = await db.port.findUniqueOrThrow({
      where: { id: portId },
      select: { authorId: true },
    })

    if (port.authorId !== user.id) {
      throw new Error("You can only edit ports you submitted.")
    }

    return await db.portEdit.create({
      data: {
        portId,
        editorId: user.id,
        diff: diff as Prisma.InputJsonValue,
      },
    })
  })
