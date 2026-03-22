import type { PlatformMany } from "~/server/web/platforms/payloads"
import { CatalogueGrid } from "./catalogue-grid"
import { PlatformCard } from "./platform-card"

type ThemePlatformsTabProps = {
  platforms: PlatformMany[]
}

const ThemePlatformsTab = ({ platforms }: ThemePlatformsTabProps) => {
  return (
    <CatalogueGrid>
      {platforms.map(platform => (
        <PlatformCard key={platform.id} platform={platform} showCount />
      ))}
    </CatalogueGrid>
  )
}

export { ThemePlatformsTab }
