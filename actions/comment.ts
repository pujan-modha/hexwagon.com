"use server"

import { revalidateTag } from "next/cache"
import { z } from "zod"
import { getIP, isRateLimited } from "~/lib/rate-limiter"
import { userProcedure } from "~/lib/safe-actions"
import { commentSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"

export const addComment = userProcedure
  .createServerAction()
  .input(commentSchema)
  .handler(async ({ input: { portId, parentId, content }, ctx: { user } }) => {
    const ip = await getIP()

    if (await isRateLimited(`comment:${ip}`, "comment")) {
      throw new Error("Too many comments. Please try again later.")
    }

    const comment = await db.comment.create({
      data: {
        content,
        portId,
        parentId,
        authorId: user.id,
      },
    })

    revalidateTag("comments", "max")
    revalidateTag(`comments-${portId}`, "max")

    return comment
  })

export const deleteComment = userProcedure
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
