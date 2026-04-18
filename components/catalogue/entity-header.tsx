import type { ReactNode } from "react"
import { Favicon } from "~/components/web/ui/favicon"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"

type EntityHeaderProps = {
  name: string
  description?: string | null
  logoSrc?: string | null
  badge?: ReactNode
  likeButton?: ReactNode
  reportButton?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

const EntityHeader = ({
  name,
  description,
  logoSrc,
  badge,
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
        <div className="flex w-full items-start justify-between gap-3 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <Favicon src={logoSrc ?? null} title={name} plain className="size-10" />
            <IntroTitle className="inline-flex items-center gap-2.5 truncate font-display font-semibold text-2xl tracking-micro leading-tight md:text-3xl">
              <span className="truncate">{name}</span>
              {badge}
            </IntroTitle>
          </div>

          <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
        </div>

        {description && <IntroDescription>{description}</IntroDescription>}
      </Intro>

      {children}
    </div>
  )
}

export { EntityHeader }
