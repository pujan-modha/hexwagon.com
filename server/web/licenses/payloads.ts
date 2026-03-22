import { Prisma, PortStatus } from "@prisma/client"

export const licenseOnePayload = Prisma.validator<Prisma.LicenseSelect>()({
  name: true,
  slug: true,
  _count: { select: { ports: { where: { status: PortStatus.Published } } } },
})

export const licenseManyPayload = Prisma.validator<Prisma.LicenseSelect>()({
  slug: true,
  name: true,
  _count: { select: { ports: { where: { status: PortStatus.Published } } } },
})

export type LicenseOne = Prisma.LicenseGetPayload<{ select: typeof licenseOnePayload }>
export type LicenseMany = Prisma.LicenseGetPayload<{ select: typeof licenseManyPayload }>
