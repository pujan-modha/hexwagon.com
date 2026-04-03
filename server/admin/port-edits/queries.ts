import { isTruthy } from "@primoui/utils"
import { EditStatus, type Prisma } from "@prisma/client"
import { db } from "~/services/db"
import type { PortEditsTableSchema } from "./schema"

export const findPortEdits = async (search: PortEditsTableSchema) => {
  const { name, page, perPage, sort, status, operator } = search

  const offset = (page - 1) * perPage

  const orderBy = sort.map(item => ({ [item.id]: item.desc ? "desc" : "asc" }) as const)

  const expressions: (Prisma.PortEditWhereInput | undefined)[] = [
    name
      ? {
          OR: [
            { port: { is: { name: { contains: name, mode: "insensitive" } } } },
            {
              editor: { is: { name: { contains: name, mode: "insensitive" } } },
            },
            {
              editor: {
                is: { email: { contains: name, mode: "insensitive" } },
              },
            },
          ],
        }
      : undefined,
    status.length > 0 ? { status: { in: status } } : undefined,
  ]

  const where: Prisma.PortEditWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [portEdits, portEditsTotal] = await db.$transaction([
    db.portEdit.findMany({
      where,
      orderBy,
      take: perPage,
      skip: offset,
      include: {
        port: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            content: true,
            repositoryUrl: true,
            license: true,
          },
        },
        editor: { select: { id: true, name: true, email: true, image: true } },
      },
    }),

    db.portEdit.count({
      where,
    }),
  ])

  const pageCount = Math.ceil(portEditsTotal / perPage)
  return { portEdits, portEditsTotal, pageCount }
}

export const findPortEditById = async (id: string) => {
  return db.portEdit.findUnique({
    where: { id },
    include: {
      port: true,
      editor: true,
    },
  })
}
