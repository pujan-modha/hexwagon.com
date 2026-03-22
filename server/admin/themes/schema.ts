import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"
import type { ThemeMany } from "~/server/web/themes/payloads"

export const themesTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<ThemeMany>().withDefault([{ id: "name", desc: false }]),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
}

export const themesTableParamsCache = createSearchParamsCache(themesTableParamsSchema)
export type ThemesTableSchema = Awaited<ReturnType<typeof themesTableParamsCache.parse>>

export const themeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  faviconUrl: z.string().optional(),
  author: z.string().optional(),
  authorUrl: z.string().url().optional().or(z.literal("")),
  guidelines: z.string().optional(),
  isFeatured: z.boolean().default(false),
  discountCode: z.string().optional(),
  discountAmount: z.string().optional(),
  licenseId: z.string().optional(),
})

export type ThemeSchema = z.infer<typeof themeSchema>
