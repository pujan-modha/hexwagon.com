"use client"

import { Children, type ReactNode, useState } from "react"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { Button } from "~/components/common/button"

type ExpandableCatalogueGridProps = {
  children: ReactNode
  previewCount?: number
  singularLabel: string
  pluralLabel?: string
  className?: string
}

export const ExpandableCatalogueGrid = ({
  children,
  previewCount = 3,
  singularLabel,
  pluralLabel,
  className,
}: ExpandableCatalogueGridProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const items = Children.toArray(children)
  const visibleItems = isExpanded ? items : items.slice(0, previewCount)
  const hiddenCount = Math.max(items.length - previewCount, 0)
  const label = hiddenCount === 1 ? singularLabel : (pluralLabel ?? `${singularLabel}s`)

  return (
    <div className="flex flex-col gap-4">
      <CatalogueGrid className={className}>{visibleItems}</CatalogueGrid>

      {hiddenCount > 0 ? (
        <div className="flex justify-start">
          <Button type="button" variant="secondary" onClick={() => setIsExpanded(value => !value)}>
            {isExpanded
              ? `Show fewer ${label}`
              : `Show ${hiddenCount.toLocaleString()} more ${label}`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
