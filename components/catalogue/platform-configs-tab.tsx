import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import type { ConfigMany } from "~/server/web/configs/payloads"
import { CatalogueGrid } from "./catalogue-grid"
import { ConfigCard } from "./config-card"

type PlatformConfigsTabProps = {
  configs: ConfigMany[]
  query: string
  sort: string
}

const configSortOptions = [
  { value: "default", label: "Best match" },
  { value: "likes.desc", label: "Most liked" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "createdAt.desc", label: "Newest" },
]

const PlatformConfigsTab = ({ configs, query, sort }: PlatformConfigsTabProps) => {
  return (
    <div className="space-y-4">
      <CatalogueSearchControls
        query={query}
        sort={sort}
        placeholder="Search configs..."
        sortOptions={configSortOptions}
      />

      <CatalogueGrid className="lg:grid-cols-2">
        {configs.map(config => (
          <ConfigCard key={config.id} config={config} />
        ))}
      </CatalogueGrid>
    </div>
  )
}

export { PlatformConfigsTab }
