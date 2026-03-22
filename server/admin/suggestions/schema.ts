import type { Suggestion } from "@prisma/client"
import { SuggestionStatus } from "@prisma/client"
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"

export const suggestionsTableParamsSchema = {
  name: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  sort: getSortingStateParser<Suggestion>().withDefault([{ id: "createdAt", desc: true }]),
  status: parseAsArrayOf(z.nativeEnum(SuggestionStatus)).withDefault([]),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
}

export const suggestionsTableParamsCache = createSearchParamsCache(suggestionsTableParamsSchema)
export type SuggestionsTableSchema = Awaited<ReturnType<typeof suggestionsTableParamsCache.parse>>
