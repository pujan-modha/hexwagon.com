import type { ComponentProps } from "react"
import { Card, CardDescription, CardFooter, CardHeader } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { Skeleton } from "~/components/common/skeleton"
import { Favicon } from "~/components/web/ui/favicon"
import { VerifiedBadge } from "~/components/web/verified-badge"
import type { PortMany } from "~/server/web/ports/payloads"
import { cx } from "~/utils/cva"

type PortCardProps = Omit<ComponentProps<typeof Card>, "href"> & {
  port: PortMany
  href?: string
}

const getPortHref = (port: PortMany) =>
  `/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`

const PortCard = ({ port, href, className, ...props }: PortCardProps) => {
  return (
    <Card asChild className={cx(className, "h-[190px] min-h-[190px]")} {...props}>
      <Link href={href ?? getPortHref(port)}>
        <CardHeader>
          <H4 as="h3" className="inline-flex items-center gap-2 truncate">
            <span className="truncate">{port.name ?? port.theme.name}</span>
            {port.isOfficial ? <VerifiedBadge size="sm" className="-mb-[0.1em]" /> : null}
          </H4>
        </CardHeader>

        <CardDescription className="min-h-[2.5rem] line-clamp-2">
          {port.description || "\u00A0"}
        </CardDescription>

        <CardFooter className="mt-auto w-full flex-col items-stretch gap-1.5 text-sm">
          <div className="flex w-full items-center gap-2">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
              <Icon name="lucide/hash" className="size-3.5" />
              Theme
            </span>

            <span className="h-px flex-1 bg-border/70" />

            <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
              <Favicon
                src={port.theme.faviconUrl}
                title={port.theme.name}
                plain
                className="size-4"
              />
              <span className="truncate">{port.theme.name}</span>
            </span>
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
              <Icon name="lucide/globe" className="size-3.5" />
              Platform
            </span>

            <span className="h-px flex-1 bg-border/70" />

            <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
              <Favicon
                src={port.platform.faviconUrl}
                title={port.platform.name}
                plain
                className="size-4"
              />
              <span className="truncate">{port.platform.name}</span>
            </span>
          </div>
        </CardFooter>
      </Link>
    </Card>
  )
}

const PortCardSkeleton = () => {
  return (
    <Card hover={false} className="h-[190px] min-h-[190px] items-stretch select-none">
      <CardHeader>
        <H4 className="w-2/3">
          <Skeleton>&nbsp;</Skeleton>
        </H4>
      </CardHeader>

      <CardDescription className="flex flex-col gap-0.5">
        <Skeleton className="h-5 w-4/5">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-3/4">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-1/2">&nbsp;</Skeleton>
      </CardDescription>

      <CardFooter>
        <Skeleton className="h-4 w-1/3">&nbsp;</Skeleton>
      </CardFooter>
    </Card>
  )
}

export { PortCard, PortCardSkeleton }
