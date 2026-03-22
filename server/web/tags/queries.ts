import { type Prisma, PortStatus } from "@prisma/client"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import { tagManyPayload } from "~/server/web/tags/payloads"
import { db } from "~/services/db"

export const findTags = async ({ where, orderBy, ...args }: Prisma.TagFindManyArgs) => {
  "use cache"

  cacheTag("tags")
  cacheLife("max")

  return db.tag.findMany({
    ...args,
    orderBy: orderBy ?? { slug: "asc" },
    where,
    select: tagManyPayload,
  })
}

export const findTag = async ({ ...args }: Prisma.TagFindFirstArgs = {}) => {
  "use cache"

  cacheTag("tags")
  cacheLife("max")

  return db.tag.findFirst({
    ...args,
    select: tagManyPayload,
  })
}
