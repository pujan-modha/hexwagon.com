import { isTruthy } from "@primoui/utils"
import { type Prisma, SuggestionStatus } from "@prisma/client"
import { db } from "~/services/db"
import type { SuggestionsTableSchema } from "./schema"

export const findSuggestions = async (search: SuggestionsTableSchema) => {
  const { name, page, perPage, sort, status, operator } = search

  const offset = (page - 1) * perPage

  const orderBy = sort.map(item => ({ [item.id]: item.desc ? "desc" : "asc" }) as const)

  const expressions: (Prisma.SuggestionWhereInput | undefined)[] = [
    name ? { name: { contains: name, mode: "insensitive" } } : undefined,
    status.length > 0 ? { status: { in: status } } : undefined,
  ]

  const where: Prisma.SuggestionWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [suggestions, suggestionsTotal] = await db.$transaction([
    db.suggestion.findMany({
      where,
      orderBy,
      take: perPage,
      skip: offset,
      include: {
        submitter: { select: { id: true, name: true, email: true, image: true } },
      },
    }),

    db.suggestion.count({
      where,
    }),
  ])

  const pageCount = Math.ceil(suggestionsTotal / perPage)
  return { suggestions, suggestionsTotal, pageCount }
}
