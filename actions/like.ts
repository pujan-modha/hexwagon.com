"use server"

import { z } from "zod"
import { userProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

const likeEntitySchema = z.object({
  entityType: z.enum(["port", "theme", "platform"]),
  entityId: z.string().min(1),
})

const getLikeWhere = (
  userId: string,
  entityType: z.infer<typeof likeEntitySchema>["entityType"],
  entityId: string,
) => {
  if (entityType === "port") {
    return { userId, portId: entityId }
  }

  if (entityType === "theme") {
    return { userId, themeId: entityId }
  }

  return { userId, platformId: entityId }
}

export const toggleLike = userProcedure
  .createServerAction()
  .input(likeEntitySchema)
  .handler(async ({ input: { entityType, entityId }, ctx: { user } }) => {
    const existingLike = await db.like.findFirst({
      where: getLikeWhere(user.id, entityType, entityId),
      select: { id: true },
    })

    if (existingLike) {
      await db.like.delete({ where: { id: existingLike.id } })
      return { liked: false }
    }

    if (entityType === "port") {
      await db.like.create({
        data: {
          user: { connect: { id: user.id } },
          port: { connect: { id: entityId } },
        },
      })

      return { liked: true }
    }

    if (entityType === "theme") {
      await db.like.create({
        data: {
          user: { connect: { id: user.id } },
          theme: { connect: { id: entityId } },
        },
      })

      return { liked: true }
    }

    await db.like.create({
      data: {
        user: { connect: { id: user.id } },
        platform: { connect: { id: entityId } },
      },
    })

    return { liked: true }
  })

export const getLikeStatus = userProcedure
  .createServerAction()
  .input(likeEntitySchema)
  .handler(async ({ input: { entityType, entityId }, ctx: { user } }) => {
    const like = await db.like.findFirst({
      where: getLikeWhere(user.id, entityType, entityId),
      select: { id: true },
    })

    return { liked: Boolean(like) }
  })

export const removeLike = userProcedure
  .createServerAction()
  .input(likeEntitySchema)
  .handler(async ({ input: { entityType, entityId }, ctx: { user } }) => {
    const { count } = await db.like.deleteMany({
      where: getLikeWhere(user.id, entityType, entityId),
    })

    return { removed: count > 0 }
  })
