import type { ReactNode } from "react"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"

type CatalogueListHeaderProps = {
  title: string
  description?: string
  count?: number
  action?: ReactNode
}

const CatalogueListHeader = ({ title, description, count, action }: CatalogueListHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <Intro>
        <IntroTitle>
          {title}
          {count !== undefined && (
            <span className="ml-2 text-lg font-normal text-muted-foreground">({count})</span>
          )}
        </IntroTitle>
        {description && <IntroDescription>{description}</IntroDescription>}
      </Intro>

      {action}
    </div>
  )
}

export { CatalogueListHeader }
