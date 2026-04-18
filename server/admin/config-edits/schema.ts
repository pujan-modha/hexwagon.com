import { type ConfigEdit, EditStatus } from "@prisma/client"
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"

export const configEditsTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<ConfigEdit>().withDefault([{ id: "createdAt", desc: true }]),
  status: parseAsArrayOf(z.nativeEnum(EditStatus)).withDefault([]),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
}

export const configEditsTableParamsCache = createSearchParamsCache(configEditsTableParamsSchema)
export type ConfigEditsTableSchema = Awaited<ReturnType<typeof configEditsTableParamsCache.parse>>
