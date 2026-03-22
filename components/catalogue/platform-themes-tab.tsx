import type { ThemeMany } from "~/server/web/themes/payloads"
import { CatalogueGrid } from "./catalogue-grid"
import { ThemeCard } from "./theme-card"

type PlatformThemesTabProps = {
  themes: ThemeMany[]
}

const PlatformThemesTab = ({ themes }: PlatformThemesTabProps) => {
  return (
    <CatalogueGrid>
      {themes.map(theme => (
        <ThemeCard key={theme.id} theme={theme} showCount />
      ))}
    </CatalogueGrid>
  )
}

export { PlatformThemesTab }
