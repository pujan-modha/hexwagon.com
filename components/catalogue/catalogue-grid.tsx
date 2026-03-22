import type { ReactNode } from "react"
import { cn } from "~/utils/cva"
import { EmptyList } from "~/components/web/empty-list"
import { Grid } from "~/components/web/ui/grid"

type CatalogueGridProps = {
  children: ReactNode
  emptyState?: ReactNode
  className?: string
}

const CatalogueGrid = ({ children, emptyState, className }: CatalogueGridProps) => {
  if (!children) {
    return (
      <EmptyList>
        <span className="text-center">{emptyState ?? "Nothing here yet. Check back later."}</span>
      </EmptyList>
    )
  }

  return (
    <Grid className={cn("grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {children}
    </Grid>
  )
}

export { CatalogueGrid }
