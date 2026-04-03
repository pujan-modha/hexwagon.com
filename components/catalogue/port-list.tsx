import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { PortCard, PortCardSkeleton } from "~/components/catalogue/port-card"
import { AdCard } from "~/components/web/ads/ad-card"
import type { PortMany } from "~/server/web/ports/payloads"

type PortListProps = {
  ports: PortMany[]
  routePrefix: "themes" | "platforms"
  themeSlug: string
  platformSlug: string
  showListingAd?: boolean
}

const PortList = ({
  ports,
  routePrefix,
  themeSlug,
  platformSlug,
  showListingAd = false,
}: PortListProps) => {
  if (!ports.length) {
    return (
      <p className="py-8 text-center text-muted-foreground">No ports found for this combination.</p>
    )
  }

  const cards = ports.flatMap((port, index) => {
    const href =
      routePrefix === "themes"
        ? `/themes/${themeSlug}/${platformSlug}/${port.id}`
        : `/platforms/${platformSlug}/${themeSlug}/${port.id}`

    const items = [<PortCard key={port.id} port={port} href={href} />]

    if (showListingAd && index === 1) {
      items.push(<AdCard key="port-list-listing-ad" slot="Listing" />)
    }

    return items
  })

  if (showListingAd && ports.length <= 1) {
    cards.push(<AdCard key="port-list-listing-ad" slot="Listing" />)
  }

  return <CatalogueGrid>{cards}</CatalogueGrid>
}

const PortListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <CatalogueGrid>
      {Array.from({ length: count }).map((_, i) => (
        <PortCardSkeleton key={i} />
      ))}
    </CatalogueGrid>
  )
}

export { PortList, PortListSkeleton }
