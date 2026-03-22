import { isTruthy } from "@primoui/utils"
import type { Prisma } from "@prisma/client"
import { endOfDay, startOfDay } from "date-fns"
import { db } from "~/services/db"
import { themeManyPayload } from "~/server/web/themes/payloads"
import type { ThemesTableSchema } from "./schema"

export const findThemes = async (search: ThemesTableSchema) => {
  const { name, page, perPage, sort, from, to, operator } = search

  const offset = (page - 1) * perPage

  const orderBy: Prisma.ThemeOrderByWithRelationInput[] = sort.map(item => {
    const direction = item.desc ? "desc" : "asc"

    if (item.id === "_count") {
      return { ports: { _count: direction } }
    }

    return { [item.id]: direction } as Prisma.ThemeOrderByWithRelationInput
  })

  const fromDate = from ? startOfDay(new Date(from)) : undefined
  const toDate = to ? endOfDay(new Date(to)) : undefined

  const expressions: (Prisma.ThemeWhereInput | undefined)[] = [
    name ? { name: { contains: name, mode: "insensitive" } } : undefined,
    fromDate || toDate ? { createdAt: { gte: fromDate, lte: toDate } } : undefined,
  ]

  const where: Prisma.ThemeWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [themes, themesTotal] = await db.$transaction([
    db.theme.findMany({
      where,
      orderBy,
      take: perPage,
      skip: offset,
      select: themeManyPayload,
    }),

    db.theme.count({
      where,
    }),
  ])

  const pageCount = Math.ceil(themesTotal / perPage)
  return { themes, themesTotal, pageCount }
}

export const findThemeList = async () => {
  return db.theme.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export const findThemeBySlug = async (slug: string) => {
  return db.theme.findUnique({
    where: { slug },
    include: { colors: true, maintainers: true },
  })
}
