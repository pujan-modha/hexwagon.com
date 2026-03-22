import type { ComponentProps } from "react"
import { Button } from "~/components/common/button"
import { Card } from "~/components/common/card"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { ExternalLink } from "~/components/web/external-link"
import type { PortOne } from "~/server/web/ports/payloads"
import { cx } from "~/utils/cva"
import { canonicalPortHref } from "~/lib/catalogue"

type PortDetailProps = {
  port: PortOne
  canonicalUrl?: string
  likeButton?: React.ReactNode
  reportButton?: React.ReactNode
}

const PortDetail = ({ port, canonicalUrl, likeButton, reportButton }: PortDetailProps) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {port.faviconUrl && (
          <img
            src={port.faviconUrl}
            alt=""
            className="size-16 rounded-lg"
          />
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{port.name}</h1>
            {port.isOfficial && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Official
              </span>
            )}
          </div>

          {port.description && (
            <p className="mt-2 text-muted-foreground">{port.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {likeButton}
            {reportButton}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {port.websiteUrl && (
          <Button asChild suffix={<Icon name="lucide/globe" />}>
            <ExternalLink href={port.websiteUrl}>
              Website
            </ExternalLink>
          </Button>
        )}

        {port.repositoryUrl && (
          <Button asChild variant="secondary" suffix={<Icon name="lucide/git-fork" />}>
            <ExternalLink href={port.repositoryUrl}>
              Repository
            </ExternalLink>
          </Button>
        )}

        {port.installUrl && (
          <Button asChild variant="secondary" suffix={<Icon name="lucide/arrow-up-right" />}>
            <Link href={port.installUrl}>
              Install
            </Link>
          </Button>
        )}
      </div>

      {/* Content */}
      {port.content && (
        <Card className="p-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {port.content}
          </div>
        </Card>
      )}

      {/* Screenshot */}
      {port.screenshotUrl && (
        <div>
          <img
            src={port.screenshotUrl}
            alt={`Screenshot of ${port.name}`}
            className="rounded-lg border"
          />
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {port.theme && (
          <Link href={`/themes/${port.theme.slug}`}>
            Theme: {port.theme.name}
          </Link>
        )}
        {port.platform && (
          <Link href={`/platforms/${port.platform.slug}`}>
            Platform: {port.platform.name}
          </Link>
        )}
        {canonicalUrl && (
          <Link href={canonicalUrl}>
            Canonical URL
          </Link>
        )}
      </div>
    </div>
  )
}

export { PortDetail }
