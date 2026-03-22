import type { ReactNode } from "react"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"

type EntityHeaderProps = {
  name: string
  description?: string | null
  externalUrl?: string
  likeButton?: ReactNode
  reportButton?: ReactNode
  children?: ReactNode
}

const EntityHeader = ({
  name,
  description,
  externalUrl,
  likeButton,
  reportButton,
  children,
}: EntityHeaderProps) => {
  return (
    <div className="flex flex-col gap-4">
      <Intro>
        <IntroTitle>{name}</IntroTitle>
        {description && <IntroDescription>{description}</IntroDescription>}
      </Intro>

      <div className="flex items-center gap-2">
        {likeButton}
        {reportButton}
        {externalUrl && (
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">
            Visit Website
          </a>
        )}
      </div>

      {children}
    </div>
  )
}

export { EntityHeader }
