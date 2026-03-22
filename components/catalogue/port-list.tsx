import type { ReactNode } from "react"
import { Card } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Link } from "~/components/common/link"
import { Skeleton } from "~/components/common/skeleton"
import type { PortMany } from "~/server/web/ports/payloads"
import { cx } from "~/utils/cva"
import { themePlatformHref } from "~/lib/catalogue"

type PortListProps = {
  ports: PortMany[]
  routePrefix: "themes" | "platforms"
  themeSlug: string
  platformSlug: string
}

const PortList = ({ ports, routePrefix, themeSlug, platformSlug }: PortListProps) => {
  if (!ports.length) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No ports found for this combination.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {ports.map(port => {
        const href =
          routePrefix === "themes"
            ? `/themes/${themeSlug}/${platformSlug}/${port.id}`
            : `/platforms/${platformSlug}/${themeSlug}/${port.id}`

        return (
          <Card key={port.id} asChild>
            <Link href={href}>
              <div className="flex items-start gap-4 p-4">
                {port.faviconUrl && (
                  <img
                    src={port.faviconUrl}
                    alt=""
                    className="size-8 rounded-md"
                  />
                )}

                <div className="flex-1">
                  <H4 as="h3" className="truncate">
                    {port.name ?? port.theme.name}
                  </H4>

                  {port.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {port.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {port.isOfficial && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Official
                      </span>
                    )}
                    {port.websiteUrl && (
                      <span className="text-xs text-muted-foreground hover:text-foreground">
                        Has website
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </Card>
        )
      })}
    </div>
  )
}

const PortListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-start gap-4 p-4">
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-2/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export { PortList, PortListSkeleton }
