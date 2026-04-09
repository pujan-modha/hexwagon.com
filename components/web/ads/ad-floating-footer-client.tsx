"use client"

import { isExternalUrl } from "@primoui/utils"
import type { MouseEvent } from "react"
import { useEffect, useState } from "react"
import { Card } from "~/components/common/card"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { ExternalLink } from "~/components/web/external-link"
import { FaviconImage } from "~/components/web/ui/favicon"
import type { AdOne } from "~/server/web/ads/payloads"
import { cx } from "~/utils/cva"

type FloatingFooterAd = Pick<
  AdOne,
  "type" | "websiteUrl" | "name" | "description" | "buttonLabel" | "faviconUrl"
> & {
  id?: string
}

type FloatingFooterAdCardProps = {
  ad: FloatingFooterAd
  className?: string
  isPreview?: boolean
  interactive?: boolean
}

const dismissedStorageKey = "hexwagon-floating-footer-ad-dismissed"

export const FloatingFooterAdCard = ({
  ad,
  className,
  isPreview = false,
  interactive = true,
}: FloatingFooterAdCardProps) => {
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (isPreview) {
      return
    }

    if (typeof window === "undefined") {
      return
    }

    setIsDismissed(sessionStorage.getItem(dismissedStorageKey) === "1")
  }, [isPreview])

  const handleDismiss = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (typeof window !== "undefined") {
      sessionStorage.setItem(dismissedStorageKey, "1")
    }

    setIsDismissed(true)
  }

  if (!isPreview && isDismissed) {
    return null
  }

  const isInternalAd = !isExternalUrl(ad.websiteUrl)

  return (
    <Card
      className={cx(
        isPreview
          ? "relative inset-auto w-full sm:w-[286px]"
          : "fixed z-50 bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 w-auto sm:w-72",
        "flex-row items-start gap-2.5 p-4 ring-0 transition duration-100 ease-out",
        interactive ? "hover:bg-accent cursor-pointer" : "cursor-default",
        "after:absolute after:inset-0 after:rounded-lg after:border-4 after:border-background after:pointer-events-none",
        className,
      )}
      hover
      focus
    >
      <div className="absolute top-0 inset-x-4 z-30 -translate-y-1/2 flex justify-start sm:justify-end">
        <Link
          href="/advertise"
          className="inline-flex items-center rounded-sm border border-border bg-background px-1 py-px text-[0.625rem] font-medium text-foreground/60"
        >
          Ad
        </Link>
      </div>

      <FaviconImage
        src={ad.faviconUrl}
        title={ad.name}
        className="size-8 rounded-md p-[0.09375em]"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h6 className="truncate text-sm/tight font-medium">{ad.name}</h6>
        <p className="line-clamp-3 text-xs text-muted-foreground text-pretty">
          {ad.description ?? "Reach developers browsing ports, themes, and platforms."}
        </p>
      </div>

      {interactive ? (
        <ExternalLink
          href={ad.websiteUrl}
          target={isInternalAd ? "_self" : undefined}
          eventName="click_ad"
          eventProps={{
            adId: ad.id,
            url: ad.websiteUrl,
            type: ad.type,
            source: "floating_footer",
          }}
          className="absolute inset-0 rounded-lg z-20"
          aria-label={`Visit ${ad.name}`}
        />
      ) : null}

      {!isPreview ? (
        <button
          type="button"
          className="absolute right-0 top-0 z-30 p-2 text-muted-foreground hover:text-foreground lg:hidden"
          onClick={handleDismiss}
          aria-label="Dismiss ad"
        >
          <Icon name="lucide/x" className="size-3.5" />
        </button>
      ) : null}
    </Card>
  )
}
