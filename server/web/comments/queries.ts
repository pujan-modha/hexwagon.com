import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import { db } from "~/services/db"

export const findCommentsByPort = async (portId: string) => {
  "use cache"
  cacheTag("comments", `comments-${portId}`)
  cacheLife("hours")
  return db.comment.findMany({
    where: { portId, parentId: null },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, image: true } },
      replies: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export const countCommentsByPort = async (portId: string) => {
  "use cache"
  cacheTag("comments", `comments-count-${portId}`)
  cacheLife("hours")
  return db.comment.count({ where: { portId } })
}
