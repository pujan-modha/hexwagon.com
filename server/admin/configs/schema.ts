import { ConfigStatus } from "@prisma/client"
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"
import type { ConfigMany } from "~/server/web/configs/payloads"

export const configsTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<ConfigMany>().withDefault([{ id: "name", desc: false }]),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  status: parseAsArrayOf(z.nativeEnum(ConfigStatus)).withDefault([]),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
}

export const configsTableParamsCache = createSearchParamsCache(configsTableParamsSchema)
export type ConfigsTableSchema = Awaited<ReturnType<typeof configsTableParamsCache.parse>>

export const configSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().optional(),
  seoFaqs: z.string().optional(),
  searchAliases: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  screenshotUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  submitterNote: z.string().optional(),
  isFeatured: z.boolean().default(false),
  order: z
    .preprocess(v => Number.parseInt(String(v), 10) || 0, z.number().int())
    .optional()
    .default(0),
  license: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.nativeEnum(ConfigStatus).default(ConfigStatus.Draft),
  themeIds: z.array(z.string()).min(1, "Select at least one theme"),
  platformIds: z.array(z.string()).min(1, "Select at least one platform"),
})

export type ConfigSchema = z.infer<typeof configSchema>
