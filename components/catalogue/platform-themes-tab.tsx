import type { ThemeMany } from "~/server/web/themes/payloads"
import { platformThemeHref } from "~/lib/catalogue"
import { CatalogueGrid } from "./catalogue-grid"
import { ThemeCard } from "./theme-card"

type PlatformThemesTabProps = {
  themes: ThemeMany[]
  platformSlug: string
}

const PlatformThemesTab = ({ themes, platformSlug }: PlatformThemesTabProps) => {
  return (
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
  )
}

export { PlatformThemesTab }
