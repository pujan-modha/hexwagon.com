import { isTruthy } from "@primoui/utils"
import { type Prisma } from "@prisma/client"
import { db } from "~/services/db"

export const findComments = async (search: {
  name?: string
  page?: number
  perPage?: number
}) => {
  const { name = "", page = 1, perPage = 25 } = search

  const offset = (page - 1) * perPage

  const where: Prisma.CommentWhereInput = name
    ? { content: { contains: name, mode: "insensitive" } }
    : {}

  const [comments, commentsTotal] = await db.$transaction([
    db.comment.findMany({
      where,
      take: perPage,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        port: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    }),

    db.comment.count({
      where,
    }),
  ])

  const pageCount = Math.ceil(commentsTotal / perPage)
  return { comments, commentsTotal, pageCount }
}
