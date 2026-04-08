export const searchPagePath = "/search"

export const searchPageSortOptions = [
  { value: "default", label: "Best match" },
  { value: "pageviews.desc", label: "Most viewed" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "createdAt.desc", label: "Newest" },
  { value: "updatedAt.desc", label: "Recently updated" },
] as const

export const buildSearchPageHref = ({
  themeQuery,
  platformQuery,
  themeSlug,
  platformSlug,
  sort,
}: {
  themeQuery?: string
  platformQuery?: string
  themeSlug?: string
  platformSlug?: string
  sort?: string
}) => {
  const params = new URLSearchParams()
  const normalizedThemeQuery = themeQuery?.trim()
  const normalizedPlatformQuery = platformQuery?.trim()
  const normalizedSort = sort?.trim()

  if (normalizedThemeQuery) {
    params.set("themeQuery", normalizedThemeQuery)
  }

  if (normalizedPlatformQuery) {
    params.set("platformQuery", normalizedPlatformQuery)
  }

  if (themeSlug?.trim()) {
    params.set("theme", themeSlug)
  }

  if (platformSlug?.trim()) {
    params.set("platform", platformSlug)
  }

  if (normalizedSort && normalizedSort !== "default") {
    params.set("sort", normalizedSort)
  }

  const queryString = params.toString()
  return queryString ? `${searchPagePath}?${queryString}` : searchPagePath
}
