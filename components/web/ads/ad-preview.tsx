"use client"

import { isExternalUrl } from "@primoui/utils"
import Image from "next/image"
import type { ComponentProps, ReactNode } from "react"
import { Badge } from "~/components/common/badge"
import { Button } from "~/components/common/button"
import { Card, CardBadges, CardDescription, CardHeader, CardIcon } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { ExternalLink } from "~/components/web/external-link"
import { Favicon, FaviconImage } from "~/components/web/ui/favicon"
import type { AdOne } from "~/server/web/ads/payloads"
import { cx } from "~/utils/cva"

export type AdPreviewAd = Pick<
  AdOne,
  "type" | "websiteUrl" | "name" | "description" | "buttonLabel" | "faviconUrl"
> & {
  id?: string
}

type AdPreviewBaseProps = ComponentProps<typeof Card> & {
  ad: AdPreviewAd
  interactive?: boolean
  className?: string
}

const getLinkProps = (ad: AdPreviewAd, interactive: boolean) => {
  if (!interactive) return {}

  const isInternalAd = !isExternalUrl(ad.websiteUrl)

  return {
    href: ad.websiteUrl,
    target: isInternalAd ? "_self" : undefined,
    eventName: "click_ad",
    eventProps: {
      adId: ad.id,
      url: ad.websiteUrl,
      type: ad.type,
      source: "card",
    },
  }
}

const AdPreviewCard = ({ ad, interactive = true, className, ...props }: AdPreviewBaseProps) => {
  const linkProps = getLinkProps(ad, interactive)
  const Wrapper = interactive ? ExternalLink : "div"

  return (
    <Card className={cx("group/button h-[190px] min-h-[190px]", className)} asChild {...props}>
      <Wrapper {...linkProps}>
        <CardBadges>
          <Badge variant="outline">Ad</Badge>
        </CardBadges>

        <CardHeader wrap={false}>
          <Favicon plain src={ad.faviconUrl} title={ad.name} className="p-[0.1em]" />

          <H4 as="strong" className="truncate">
            {ad.name}
          </H4>
        </CardHeader>

        <CardDescription className="mb-auto pr-2 line-clamp-4">{ad.description}</CardDescription>

        <Button
          className="pointer-events-none md:w-full"
          suffix={<Icon name="lucide/arrow-up-right" />}
          asChild
        >
          <span>{ad.buttonLabel || `Visit ${ad.name}`}</span>
        </Button>

        {ad.faviconUrl ? (
          <CardIcon>
            <FaviconImage src={ad.faviconUrl} title={ad.name} />
          </CardIcon>
        ) : null}
      </Wrapper>
    </Card>
  )
}

const AdPreviewBanner = ({ ad, interactive = true, className, ...props }: AdPreviewBaseProps) => {
  const linkProps = interactive
    ? {
        ...getLinkProps(ad, interactive),
        eventProps: {
          adId: ad.id,
          url: ad.websiteUrl,
          type: ad.type,
          source: "banner",
        },
      }
    : {}
  const Wrapper = interactive ? ExternalLink : "div"

  return (
    <Card
      className={cx("flex-row items-center gap-3 px-3 py-2.5 md:px-4", className)}
      asChild
      {...props}
    >
      <Wrapper {...linkProps}>
        <Badge variant="outline" className="leading-none max-sm:order-last">
          Ad
        </Badge>

        <div className="text-xs leading-tight text-secondary-foreground mr-auto sm:text-sm">
          {ad.faviconUrl ? (
            <Image
              src={ad.faviconUrl}
              alt={ad.name}
              width={32}
              height={32}
              unoptimized
              className="flex float-left align-middle mr-1.5 size-3.5 rounded-sm sm:size-4"
            />
          ) : null}
          <strong className="font-medium text-foreground">{ad.name}</strong> — {ad.description}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 leading-none pointer-events-none max-sm:hidden"
          asChild
        >
          <span>{ad.buttonLabel ?? "Learn More"}</span>
        </Button>
      </Wrapper>
    </Card>
  )
}

export { AdPreviewCard, AdPreviewBanner }
