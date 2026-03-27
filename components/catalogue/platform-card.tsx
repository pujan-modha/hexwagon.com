import type { ComponentProps } from "react"
import plur from "plur"
import { Card, CardDescription, CardFooter, CardHeader } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Link } from "~/components/common/link"
import { Skeleton } from "~/components/common/skeleton"
import { Favicon } from "~/components/web/ui/favicon"
import type { PlatformMany } from "~/server/web/platforms/payloads"
type PlatformCardProps = Omit<ComponentProps<typeof Card>, "href"> & {
  platform: PlatformMany
  showCount?: boolean
}

const PlatformCard = ({ platform, showCount, className, ...props }: PlatformCardProps) => {
  return (
    <Card asChild className={className} {...props}>
      <Link href={`/platforms/${platform.slug}`}>
        <CardHeader wrap={false}>
          <Favicon src={platform.faviconUrl} title={platform.name} plain />

          <H4 as="h3" className="truncate">
            {platform.name}
          </H4>
        </CardHeader>

        <CardDescription className="min-h-[3.75rem] line-clamp-3">
          {platform.description || "\u00A0"}
        </CardDescription>

        {showCount && (
          <CardFooter className="mt-auto">
            {platform._count.ports} {plur("port", platform._count.ports)}
          </CardFooter>
        )}
      </Link>
    </Card>
  )
}

const PlatformCardSkeleton = () => {
  return (
    <Card hover={false} className="items-stretch select-none">
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

export { PlatformCard, PlatformCardSkeleton }
