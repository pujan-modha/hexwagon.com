import { Prisma, PortStatus } from "@prisma/client"

export const tagManyPayload = Prisma.validator<Prisma.TagSelect>()({
  slug: true,
})

export type TagMany = Prisma.TagGetPayload<{ select: typeof tagManyPayload }>
