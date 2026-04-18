import { isTruthy } from "@primoui/utils"
import { PortStatus, type Prisma } from "@prisma/client"
import { endOfDay, startOfDay } from "date-fns"
import { portManyExtendedPayload } from "~/server/web/ports/payloads"
import { db } from "~/services/db"
import type { PortsTableSchema } from "./schema"

const adminPortOnePayload = {
  id: true,
  name: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  seoFaqs: true,
  searchAliases: true,
  content: true,
  repositoryUrl: true,
  faviconUrl: true,
  screenshotUrl: true,
  status: true,
  rejectionReason: true,
  submitterName: true,
  submitterEmail: true,
  submitterNote: true,
  isFeatured: true,
  isOfficial: true,
  publishedAt: true,
  license: true,
  likes: true,
  score: true,
  pageviews: true,
  createdAt: true,
  updatedAt: true,
  themeId: true,
  platformId: true,
  theme: true,
  platform: true,
  tags: true,
} satisfies Prisma.PortSelect

export const findPorts = async (search: PortsTableSchema, where?: Prisma.PortWhereInput) => {
  const { name, sort, page, perPage, from, to, operator, status, themeId, platformId } = search

  const offset = (page - 1) * perPage

  const orderBy: Prisma.PortOrderByWithRelationInput[] = sort.map(item => {
    const direction = item.desc ? "desc" : "asc"

    if (item.id === "theme" || item.id === "platform") {
      return { [item.id]: { name: direction } } as Prisma.PortOrderByWithRelationInput
    }

    return { [item.id]: direction } as Prisma.PortOrderByWithRelationInput
  })

  const fromDate = from ? startOfDay(new Date(from)) : undefined
  const toDate = to ? endOfDay(new Date(to)) : undefined

  const expressions: (Prisma.PortWhereInput | undefined)[] = [
    name ? { name: { contains: name, mode: "insensitive" } } : undefined,
    fromDate || toDate ? { createdAt: { gte: fromDate, lte: toDate } } : undefined,
    status.length > 0 ? { status: { in: status } } : undefined,
    themeId ? { themeId } : undefined,
    platformId ? { platformId } : undefined,
  ]

  const whereQuery: Prisma.PortWhereInput = {
    [operator.toUpperCase()]: expressions.filter(isTruthy),
  }

  const [ports, portsTotal] = await db.$transaction([
    db.port.findMany({
      where: { ...whereQuery, ...where },
      orderBy,
      take: perPage,
      skip: offset,
      select: portManyExtendedPayload,
    }),

    db.port.count({
      where: { ...whereQuery, ...where },
    }),
  ])

  const pageCount = Math.ceil(portsTotal / perPage)
  return { ports, portsTotal, pageCount }
}

export const findScheduledPorts = async () => {
  return db.port.findMany({
    where: { status: PortStatus.Scheduled },
    select: { slug: true, name: true, publishedAt: true },
    orderBy: { publishedAt: "asc" },
  })
}

export const findPortList = async () => {
  return db.port.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export const findPortBySlug = async (slug: string) => {
  return db.port.findUnique({
    where: { slug },
    select: adminPortOnePayload,
  })
}
