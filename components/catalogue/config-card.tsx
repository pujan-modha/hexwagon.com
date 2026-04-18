import type { ComponentProps } from "react"
import { Card, CardDescription, CardFooter, CardHeader } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { Skeleton } from "~/components/common/skeleton"
import { Favicon } from "~/components/web/ui/favicon"
import { configHref } from "~/lib/catalogue"
import type { ConfigMany } from "~/server/web/configs/payloads"
import { cx } from "~/utils/cva"

type ConfigCardProps = Omit<ComponentProps<typeof Card>, "href"> & {
  config: ConfigMany
  href?: string
  showCounts?: boolean
}

const ConfigCard = ({ config, href, showCounts = true, className, ...props }: ConfigCardProps) => {
  return (
    <Card asChild className={cx(className, "h-[190px] min-h-[190px]")} {...props}>
      <Link href={href ?? configHref(config.slug)}>
        <CardHeader wrap={false}>
          <Favicon src={config.faviconUrl} title={config.name} plain />

          <H4 as="h3" className="truncate">
            {config.name}
          </H4>
        </CardHeader>

        <CardDescription className="min-h-[3.75rem] line-clamp-3">
          {config.description || "\u00A0"}
        </CardDescription>

        {showCounts ? (
          <CardFooter className="mt-auto w-full text-sm">
            <div className="flex w-full items-center gap-4 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="lucide/sparkles" className="size-3.5" />
                <span className="tabular-nums">{config._count.configThemes.toLocaleString()}</span>
                Themes
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Icon name="lucide/blocks" className="size-3.5" />
                <span className="tabular-nums">
                  {config._count.configPlatforms.toLocaleString()}
                </span>
                Platforms
              </span>
            </div>
          </CardFooter>
        ) : null}
      </Link>
    </Card>
  )
}

const ConfigCardSkeleton = () => {
  return (
    <Card hover={false} className="h-[190px] min-h-[190px] items-stretch select-none">
      <CardHeader wrap={false}>
        <Favicon src="/favicon.png" plain className="animate-pulse opacity-50" />

        <H4 className="w-2/3">
          <Skeleton>&nbsp;</Skeleton>
        </H4>
      </CardHeader>

      <CardDescription className="flex flex-col gap-0.5">
        <Skeleton className="h-5 w-4/5">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-3/4">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-1/2">&nbsp;</Skeleton>
      </CardDescription>

      <CardFooter className="gap-4">
        <Skeleton className="h-4 w-1/4">&nbsp;</Skeleton>
        <Skeleton className="h-4 w-1/4">&nbsp;</Skeleton>
      </CardFooter>
    </Card>
  )
}

export { ConfigCard, ConfigCardSkeleton }
