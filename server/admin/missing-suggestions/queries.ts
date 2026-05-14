import { isTruthy } from "@primoui/utils"
import type { Prisma } from "@prisma/client"
import { db } from "~/services/db"
import type { MissingSuggestionsTableSchema } from "./schema"

export const findMissingSuggestions = async (search: MissingSuggestionsTableSchema) => {
  const { q, sort, page, perPage, operator, type, status } = search
  const offset = (page - 1) * perPage

  const orderBy: Prisma.MissingSuggestionOrderByWithRelationInput[] = sort.map(item => {
    const direction = item.desc ? "desc" : "asc"

    if (item.id === "votes") return { votes: { _count: direction } }
    if (item.id === "links") return { links: { _count: direction } }

    return { [item.id]: direction } as Prisma.MissingSuggestionOrderByWithRelationInput
  })

  const expressions: (Prisma.MissingSuggestionWhereInput | undefined)[] = [
    q
      ? {
          OR: [
            { label: { contains: q, mode: "insensitive" } },
            { themeName: { contains: q, mode: "insensitive" } },
            { platformName: { contains: q, mode: "insensitive" } },
            { configName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    type.length > 0 ? { type: { in: type } } : undefined,
    status.length > 0 ? { status: { in: status } } : undefined,
  ]

  const where: Prisma.MissingSuggestionWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [missingSuggestions, missingSuggestionsTotal] = await db.$transaction([
    db.missingSuggestion.findMany({
      where,
      orderBy,
      take: perPage,
      skip: offset,
      include: {
        theme: { select: { name: true, slug: true } },
        platform: { select: { name: true, slug: true } },
        links: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, url: true, status: true },
        },
        _count: { select: { votes: true, links: true } },
      },
    }),
    db.missingSuggestion.count({ where }),
  ])

  return {
    missingSuggestions,
    missingSuggestionsTotal,
    pageCount: Math.ceil(missingSuggestionsTotal / perPage),
  }
}
