import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"
import type { PlatformMany } from "~/server/web/platforms/payloads"

export const platformsTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<PlatformMany>().withDefault([{ id: "name", desc: false }]),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
}

export const platformsTableParamsCache = createSearchParamsCache(platformsTableParamsSchema)
export type PlatformsTableSchema = Awaited<ReturnType<typeof platformsTableParamsCache.parse>>

export const platformSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().optional(),
  installInstructions: z.string().optional(),
  themeCreationDocs: z.string().optional(),
  isFeatured: z.boolean().default(false),
  order: z
    .preprocess(v => Number.parseInt(String(v), 10) || 0, z.number().int())
    .optional()
    .default(0),
  license: z.string().trim().max(120).optional().or(z.literal("")),
})

export type PlatformSchema = z.infer<typeof platformSchema>
