import type { ReactNode } from "react"
import { Favicon } from "~/components/web/ui/favicon"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"

type EntityHeaderProps = {
  name: string
  description?: string | null
  logoSrc?: string | null
  likeButton?: ReactNode
  reportButton?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

const EntityHeader = ({
  name,
  description,
  logoSrc,
  likeButton,
  reportButton,
  actions,
  children,
}: EntityHeaderProps) => {
  const headerActions = actions ?? (
    <>
      {likeButton}
      {reportButton}
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      <Intro>
        <div className="flex w-full items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Favicon src={logoSrc ?? null} title={name} plain className="size-10" />
            <IntroTitle className="truncate">{name}</IntroTitle>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
          </div>
        </div>

        {description && <IntroDescription>{description}</IntroDescription>}
      </Intro>

      {children}
    </div>
  )
}

export { EntityHeader }
