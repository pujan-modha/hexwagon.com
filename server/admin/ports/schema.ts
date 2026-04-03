import { type Port, PortStatus } from "@prisma/client"
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"
import type { PortManyExtended } from "~/server/web/ports/payloads"
import { repositorySchema } from "~/server/web/shared/schema"

export const portsTableParamsSchema = {
  name: parseAsString.withDefault(""),
  sort: getSortingStateParser<PortManyExtended>().withDefault([{ id: "createdAt", desc: true }]),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
  status: parseAsArrayOf(z.nativeEnum(PortStatus)).withDefault([]),
  themeId: parseAsString.withDefault(""),
  platformId: parseAsString.withDefault(""),
}

export const portsTableParamsCache = createSearchParamsCache(portsTableParamsSchema)
export type PortsTableSchema = Awaited<ReturnType<typeof portsTableParamsCache.parse>>

export const portSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  repositoryUrl: repositorySchema.optional().or(z.literal("")),
  faviconUrl: z.string().optional().or(z.literal("")),
  screenshotUrl: z.string().optional().or(z.literal("")),
  isOfficial: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email().optional().or(z.literal("")),
  submitterNote: z.string().optional(),
  publishedAt: z.coerce.date().nullish(),
  status: z.nativeEnum(PortStatus).default("Draft"),
  rejectionReason: z.string().optional(),
  themeId: z.string().optional(),
  platformId: z.string().optional(),
  license: z.string().trim().max(120).optional().or(z.literal("")),
})

export type PortSchema = z.infer<typeof portSchema>
