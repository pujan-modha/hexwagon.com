"use server"

import { revalidateTag } from "next/cache"
import { z } from "zod"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

export const deleteComment = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input: { id } }) => {
    const comment = await db.comment.delete({
      where: { id },
      select: { portId: true },
    })

    revalidateTag("comments", "max")
    revalidateTag(`comments-${comment.portId}`, "max")

    return true
  })
