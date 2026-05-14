import type { MissingSuggestionType, Prisma } from "@prisma/client"
import {
  buildMissingSuggestionLabel,
  normalizeMissingSuggestionText,
} from "~/lib/missing-suggestions"
import { db } from "~/services/db"

type MissingSuggestionLookup = {
  type: MissingSuggestionType
  label: string
  themeName?: string
  platformName?: string
  configName?: string
}

export const findMissingSuggestionDemand = async (lookup: MissingSuggestionLookup) => {
  const label = buildMissingSuggestionLabel(lookup)
  const where: Prisma.MissingSuggestionWhereInput = {
    type: lookup.type,
    normalizedLabel: normalizeMissingSuggestionText(label),
    normalizedTheme: normalizeMissingSuggestionText(lookup.themeName),
    normalizedPlatform: normalizeMissingSuggestionText(lookup.platformName),
    normalizedConfig: normalizeMissingSuggestionText(lookup.configName),
  }

  const suggestion = await db.missingSuggestion.findFirst({
    where,
    select: {
      id: true,
      _count: {
        select: {
          votes: true,
          links: true,
        },
      },
    },
  })

  return {
    id: suggestion?.id,
    count: suggestion?._count.votes ?? 0,
    linksCount: suggestion?._count.links ?? 0,
  }
}
