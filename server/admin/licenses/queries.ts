import type { Prisma } from "@prisma/client"
import { db } from "~/services/db"

export const findLicenseList = async () => {
  return db.license.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })
}

export const findAdminLicenses = async ({ where, orderBy, ...args }: Prisma.LicenseFindManyArgs) => {
  return db.license.findMany({
    ...args,
    where,
    orderBy: orderBy ?? { name: "asc" },
    select: { id: true, name: true, slug: true },
  })
}
