import { isTruthy } from "@primoui/utils"
import { EditStatus, type Prisma } from "@prisma/client"
import { db } from "~/services/db"
import type { ConfigEditsTableSchema } from "./schema"

export const findConfigEdits = async (search: ConfigEditsTableSchema) => {
  const { name, page, perPage, sort, status, operator } = search

  const offset = (page - 1) * perPage
  const orderBy = sort.map(item => ({ [item.id]: item.desc ? "desc" : "asc" }) as const)

  const expressions: (Prisma.ConfigEditWhereInput | undefined)[] = [
    name
      ? {
          OR: [
            { config: { is: { name: { contains: name, mode: "insensitive" } } } },
            { editor: { is: { name: { contains: name, mode: "insensitive" } } } },
            { editor: { is: { email: { contains: name, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    status.length > 0 ? { status: { in: status } } : undefined,
  ]

  const where: Prisma.ConfigEditWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [configEdits, configEditsTotal] = await db.$transaction([
    db.configEdit.findMany({
      where,
      orderBy,
      take: perPage,
      skip: offset,
      include: {
        config: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            content: true,
            repositoryUrl: true,
            license: true,
            fonts: true,
            screenshots: true,
            configThemes: {
              select: {
                theme: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { theme: { name: "asc" } }],
            },
            configPlatforms: {
              select: {
                platform: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { platform: { name: "asc" } }],
            },
          },
        },
        editor: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    db.configEdit.count({ where }),
  ])

  const pageCount = Math.ceil(configEditsTotal / perPage)
  return { configEdits, configEditsTotal, pageCount }
}

export const findConfigEditById = async (id: string) => {
  return db.configEdit.findUnique({
    where: { id },
    include: {
      config: true,
      editor: true,
    },
  })
}
