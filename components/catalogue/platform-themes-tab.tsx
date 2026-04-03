import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import { platformThemeHref } from "~/lib/catalogue"
import type { ThemeMany } from "~/server/web/themes/payloads"
import { CatalogueGrid } from "./catalogue-grid"
import { ThemeCard } from "./theme-card"

type PlatformThemesTabProps = {
  themes: ThemeMany[]
  platformSlug: string
  query: string
  sort: string
}

const themeSortOptions = [
  { value: "default", label: "Best match" },
  { value: "pageviews.desc", label: "Most viewed" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "createdAt.desc", label: "Newest" },
]

const PlatformThemesTab = ({ themes, platformSlug, query, sort }: PlatformThemesTabProps) => {
  return (
    <div className="space-y-4">
      <CatalogueSearchControls
        query={query}
        sort={sort}
        placeholder="Search themes..."
        sortOptions={themeSortOptions}
      />

      <CatalogueGrid className="lg:grid-cols-2">
        {themes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            href={platformThemeHref(platformSlug, theme.slug)}
            showCount
          />
        ))}
      </CatalogueGrid>
    </div>
  )
}

export { PlatformThemesTab }
