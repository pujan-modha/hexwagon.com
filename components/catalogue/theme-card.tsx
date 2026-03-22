import type { ComponentProps } from "react"
import plur from "plur"
import { Card, CardDescription, CardFooter, CardHeader } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Link } from "~/components/common/link"
import { Skeleton } from "~/components/common/skeleton"
import { Favicon } from "~/components/web/ui/favicon"
import type { ThemeMany } from "~/server/web/themes/payloads"

type ThemeCardProps = Omit<ComponentProps<typeof Card>, "href"> & {
  theme: ThemeMany
  showCount?: boolean
}

const ThemeCard = ({ theme, showCount, ...props }: ThemeCardProps) => {
  return (
    <Card asChild {...props}>
      <Link href={`/themes/${theme.slug}`}>
        <CardHeader wrap={false}>
          <Favicon src={theme.faviconUrl} title={theme.name} />

          <H4 as="h3" className="truncate">
            {theme.name}
          </H4>
        </CardHeader>

        {theme.description && (
          <CardDescription className="line-clamp-3">{theme.description}</CardDescription>
        )}

        {showCount && (
          <CardFooter className="mt-auto">
            {theme._count.ports} {plur("port", theme._count.ports)}
          </CardFooter>
        )}
      </Link>
    </Card>
  )
}

const ThemeCardSkeleton = () => {
  return (
    <Card hover={false} className="items-stretch select-none">
      <CardHeader>
        <Favicon src="/favicon.png" className="animate-pulse opacity-50" />

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
