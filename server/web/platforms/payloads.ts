import { PortStatus, Prisma } from "@prisma/client"

export const platformOnePayload = Prisma.validator<Prisma.PlatformSelect>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  seoIntro: true,
  seoFaqs: true,
  searchAliases: true,
  websiteUrl: true,
  faviconUrl: true,
  installInstructions: true,
  themeCreationDocs: true,
  isFeatured: true,
  order: true,
  pageviews: true,
  createdAt: true,
  updatedAt: true,
  license: true,
  _count: {
    select: {
      ports: { where: { status: PortStatus.Published } },
    },
  },
})

export const platformManyPayload = Prisma.validator<Prisma.PlatformSelect>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  seoIntro: true,
  searchAliases: true,
  faviconUrl: true,
  isFeatured: true,
  order: true,
  pageviews: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      ports: { where: { status: PortStatus.Published } },
    },
  },
})

export type PlatformOne = Prisma.PlatformGetPayload<{
  select: typeof platformOnePayload
}>
export type PlatformMany = Prisma.PlatformGetPayload<{
  select: typeof platformManyPayload
}>
