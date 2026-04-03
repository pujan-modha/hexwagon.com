import { DashboardUnlikeButton } from "~/app/(web)/dashboard/unlike-button"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { PlatformCard } from "~/components/catalogue/platform-card"
import { PortCard } from "~/components/catalogue/port-card"
import { ThemeCard } from "~/components/catalogue/theme-card"
import { canonicalPortHref } from "~/lib/catalogue"
import type { findUserLikedEntities } from "~/server/web/likes/queries"

type LikedSectionProps = {
  liked: Awaited<ReturnType<typeof findUserLikedEntities>>
}

const EmptyState = ({ message }: { message: string }) => (
  <p className="text-sm text-muted-foreground">{message}</p>
)

export const DashboardLikedSection = ({ liked }: LikedSectionProps) => {
  return (
    <section className="mt-10 space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Your likes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved ports, themes, and platforms, sorted by most recently liked.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Liked Ports ({liked.ports.length})</h3>

        {liked.ports.length > 0 ? (
          <CatalogueGrid>
            {liked.ports.map(port => (
              <div key={port.id} className="relative">
                <DashboardUnlikeButton entityType="port" entityId={port.id} />
                <PortCard
                  port={port}
                  href={canonicalPortHref(port.theme.slug, port.platform.slug, port.id)}
                />
              </div>
            ))}
          </CatalogueGrid>
        ) : (
          <EmptyState message="You have not liked any ports yet." />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Liked Themes ({liked.themes.length})</h3>

        {liked.themes.length > 0 ? (
          <CatalogueGrid>
            {liked.themes.map(theme => (
              <div key={theme.id} className="relative">
                <DashboardUnlikeButton entityType="theme" entityId={theme.id} />
                <ThemeCard theme={theme} showCount />
              </div>
            ))}
          </CatalogueGrid>
        ) : (
          <EmptyState message="You have not liked any themes yet." />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Liked Platforms ({liked.platforms.length})</h3>

        {liked.platforms.length > 0 ? (
          <CatalogueGrid>
            {liked.platforms.map(platform => (
              <div key={platform.id} className="relative">
                <DashboardUnlikeButton entityType="platform" entityId={platform.id} />
                <PlatformCard platform={platform} showCount />
              </div>
            ))}
          </CatalogueGrid>
        ) : (
          <EmptyState message="You have not liked any platforms yet." />
        )}
      </div>
    </section>
  )
}
