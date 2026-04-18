import { parseSearchAliases } from "~/lib/seo"

type SearchableEntity = {
  name?: string | null
  slug?: string | null
  searchAliases?: string | null
}

const normalizeSearchValue = (value: string) => value.trim().toLowerCase()

const compactSearchValue = (value: string) => normalizeSearchValue(value).replace(/[^a-z0-9]+/g, "")

const splitSearchWords = (value: string) =>
  normalizeSearchValue(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)

export const buildSearchTerms = (...values: Array<string | null | undefined>) => {
  const terms = new Set<string>()

  for (const value of values) {
    if (!value) continue

    const normalized = normalizeSearchValue(value)

    if (!normalized) continue

    terms.add(normalized)

    const compact = compactSearchValue(value)

    if (compact && compact !== normalized) {
      terms.add(compact)
    }

    const words = splitSearchWords(value)

    if (words.length > 1) {
      const initials = words.map(word => word[0]).join("")

      if (initials.length > 1) {
        terms.add(initials)
      }

      const shorthand = `${words
        .slice(0, -1)
        .map(word => word[0])
        .join("")}${words.at(-1) ?? ""}`

      if (shorthand.length > 1) {
        terms.add(shorthand)
      }
    }
  }

  return Array.from(terms)
}

export const buildEntitySearchTerms = (entity: SearchableEntity) =>
  buildSearchTerms(entity.name, entity.slug, ...parseSearchAliases(entity.searchAliases))

export const matchesSearchTerms = ({
  query,
  terms,
  text = [],
}: {
  query: string
  terms?: string[]
  text?: Array<string | null | undefined>
}) => {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return true
  }

  const compactQuery = compactSearchValue(query)

  for (const value of text) {
    if (!value) continue

    const normalizedValue = normalizeSearchValue(value)

    if (normalizedValue.includes(normalizedQuery)) {
      return true
    }

    if (compactQuery && compactSearchValue(value).includes(compactQuery)) {
      return true
    }
  }

  for (const term of terms ?? []) {
    if (!term) continue

    if (term.includes(normalizedQuery)) {
      return true
    }

    if (compactQuery && compactSearchValue(term).includes(compactQuery)) {
      return true
    }
  }

  return false
}
