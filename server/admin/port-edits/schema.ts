import { EditStatus, type PortEdit } from "@prisma/client"
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"

export const portEditsTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<PortEdit>().withDefault([{ id: "createdAt", desc: true }]),
  status: parseAsArrayOf(z.nativeEnum(EditStatus)).withDefault([]),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
}

export const portEditsTableParamsCache = createSearchParamsCache(portEditsTableParamsSchema)
export type PortEditsTableSchema = Awaited<ReturnType<typeof portEditsTableParamsCache.parse>>
