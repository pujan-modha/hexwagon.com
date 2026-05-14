import { MissingSuggestionStatus, MissingSuggestionType } from "@prisma/client"
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { z } from "zod"
import { getSortingStateParser } from "~/lib/parsers"

export const missingSuggestionsTableParamsSchema = {
  q: parseAsString.withDefault(""),
  sort: getSortingStateParser<any>().withDefault([{ id: "updatedAt", desc: true }]),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(25),
  operator: parseAsStringEnum(["and", "or"]).withDefault("and"),
  type: parseAsArrayOf(z.nativeEnum(MissingSuggestionType)).withDefault([]),
  status: parseAsArrayOf(z.nativeEnum(MissingSuggestionStatus)).withDefault([]),
}

export const missingSuggestionsTableParamsCache = createSearchParamsCache(
  missingSuggestionsTableParamsSchema,
)
export type MissingSuggestionsTableSchema = Awaited<
  ReturnType<typeof missingSuggestionsTableParamsCache.parse>
>
