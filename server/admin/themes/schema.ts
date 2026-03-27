import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { z } from "zod";
import { getSortingStateParser } from "~/lib/parsers";
import type { ThemeMany } from "~/server/web/themes/payloads";

export const themesTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<ThemeMany>().withDefault([
    { id: "name", desc: false },
  ]),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
};

export const themesTableParamsCache = createSearchParamsCache(
  themesTableParamsSchema,
);
export type ThemesTableSchema = Awaited<
  ReturnType<typeof themesTableParamsCache.parse>
>;

export const colorPaletteEntrySchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Label is required"),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  order: z.number().int().default(0),
});

export const themePaletteSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Palette name is required").default("Default"),
  colors: z.array(colorPaletteEntrySchema),
});

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
  order: z
    .preprocess((v) => parseInt(String(v), 10) || 0, z.number().int())
    .optional()
    .default(0),
  discountCode: z.string().optional(),
  discountAmount: z.string().optional(),
  license: z.string().trim().max(120).optional().or(z.literal("")),
  palettes: z.array(themePaletteSchema).optional(),
});

export type ThemeSchema = z.infer<typeof themeSchema>;
export type ColorPaletteEntrySchema = z.infer<typeof colorPaletteEntrySchema>;
