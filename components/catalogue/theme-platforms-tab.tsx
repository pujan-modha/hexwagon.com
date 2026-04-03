import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import { themePlatformHref } from "~/lib/catalogue"
import type { PlatformMany } from "~/server/web/platforms/payloads"
import { CatalogueGrid } from "./catalogue-grid"
import { PlatformCard } from "./platform-card"

type ThemePlatformsTabProps = {
  platforms: PlatformMany[]
  themeSlug: string
  query: string
  sort: string
}

const platformSortOptions = [
  { value: "default", label: "Best match" },
  { value: "pageviews.desc", label: "Most viewed" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "createdAt.desc", label: "Newest" },
]

const ThemePlatformsTab = ({ platforms, themeSlug, query, sort }: ThemePlatformsTabProps) => {
  return (
    <div className="space-y-4">
      <CatalogueSearchControls
        query={query}
        sort={sort}
        placeholder="Search platforms..."
        sortOptions={platformSortOptions}
      />

      <CatalogueGrid className="lg:grid-cols-2">
        {platforms.map(platform => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            href={themePlatformHref(themeSlug, platform.slug)}
            showCount
          />
        ))}
      </CatalogueGrid>
    </div>
  )
}

export { ThemePlatformsTab }
