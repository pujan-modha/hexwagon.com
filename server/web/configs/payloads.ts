import { ConfigStatus, EditStatus, Prisma } from "@prisma/client"
import { platformManyPayload } from "~/server/web/platforms/payloads"
import { themeManyPayload } from "~/server/web/themes/payloads"

export const configThemePayload = Prisma.validator<Prisma.ConfigThemeSelect>()({
  isPrimary: true,
  order: true,
  theme: { select: themeManyPayload },
})

export const configPlatformPayload = Prisma.validator<Prisma.ConfigPlatformSelect>()({
  isPrimary: true,
  order: true,
  platform: { select: platformManyPayload },
})

export const configOnePayload = Prisma.validator<Prisma.ConfigSelect>()({
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
  websiteUrl: true,
  screenshotUrl: true,
  screenshots: true,
  fonts: true,
  faviconUrl: true,
  license: true,
  isFeatured: true,
  order: true,
  pageviews: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      configThemes: true,
      configPlatforms: true,
      likes: true,
    },
  },
  configThemes: {
    select: configThemePayload,
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { theme: { name: "asc" } }],
  },
  configPlatforms: {
    select: configPlatformPayload,
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }, { platform: { name: "asc" } }],
  },
  pendingEdits: {
    where: { status: EditStatus.Pending },
    select: {
      id: true,
      diff: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  },
})

export const configManyPayload = Prisma.validator<Prisma.ConfigSelect>()({
  id: true,
  name: true,
  slug: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  searchAliases: true,
  repositoryUrl: true,
  websiteUrl: true,
  screenshotUrl: true,
  screenshots: true,
  fonts: true,
  faviconUrl: true,
  license: true,
  isFeatured: true,
  order: true,
  pageviews: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      configThemes: true,
      configPlatforms: true,
      likes: true,
    },
  },
})

export type ConfigOne = Prisma.ConfigGetPayload<{
  select: typeof configOnePayload
}>

export type ConfigMany = Prisma.ConfigGetPayload<{
  select: typeof configManyPayload
}>

export const isPublishedConfig = (status: ConfigStatus) => status === ConfigStatus.Published
