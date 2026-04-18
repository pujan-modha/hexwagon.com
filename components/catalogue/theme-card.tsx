import plur from "plur"
import type { ComponentProps } from "react"
import { Card, CardDescription, CardFooter, CardHeader } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { Skeleton } from "~/components/common/skeleton"
import { Favicon } from "~/components/web/ui/favicon"
import { VerifiedBadge } from "~/components/web/verified-badge"
import { themeHref } from "~/lib/catalogue"
import type { ThemeMany } from "~/server/web/themes/payloads"
import { cx } from "~/utils/cva"

type ThemeCardProps = Omit<ComponentProps<typeof Card>, "href"> & {
  theme: ThemeMany
  showCount?: boolean
  href?: string
}

const ThemeCard = ({ theme, showCount, href, className, ...props }: ThemeCardProps) => {
  return (
    <Card asChild className={cx(className, "h-[190px] min-h-[190px]")} {...props}>
      <Link href={href ?? themeHref(theme.slug)}>
        <CardHeader wrap={false}>
          <Favicon src={theme.faviconUrl} title={theme.name} plain />

          <H4 as="h3" className="inline-flex items-center gap-1.5 truncate">
            <span className="truncate">{theme.name}</span>
            {theme._count.maintainers > 0 ? <VerifiedBadge size="sm" /> : null}
          </H4>
        </CardHeader>

        <CardDescription className="min-h-[3.75rem] line-clamp-3">
          {theme.description || "\u00A0"}
        </CardDescription>

        {showCount && (
          <CardFooter className="mt-auto w-full text-sm">
            <div className="flex w-full items-center gap-2">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                <Icon name="lucide/layout-dashboard" className="size-3.5" />
                Ports
              </span>

              <span className="h-px flex-1 bg-border/70" />

              <span className="tabular-nums font-semibold text-foreground">
                {theme._count.ports.toLocaleString()}
              </span>
            </div>
          </CardFooter>
        )}
      </Link>
    </Card>
  )
}

const ThemeCardSkeleton = () => {
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

      <CardFooter>
        <Skeleton className="h-4 w-1/3">&nbsp;</Skeleton>
      </CardFooter>
    </Card>
  )
}

export { ThemeCard, ThemeCardSkeleton }
