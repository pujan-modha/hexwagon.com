"use client"

import { getUrlHostname, isExternalUrl } from "@primoui/utils"
import type { Properties } from "posthog-js"
import type { ComponentProps } from "react"
import { siteConfig } from "~/config/site"
import { trackRawEvent } from "~/hooks/use-analytics"
import { addSearchParams } from "~/utils/search-params"

type AdClickPayload = {
  adId: string
  url: string
  source?: string
  type?: string
}

type ExternalLinkProps = ComponentProps<"a"> & {
  doTrack?: boolean
  doFollow?: boolean
  eventName?: string
  eventProps?: Properties
}

const getStringProp = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null

const getAdClickPayload = (
  eventProps?: Properties,
  fallbackUrl?: string,
): AdClickPayload | null => {
  const adId = getStringProp(eventProps?.adId)

  if (!adId) {
    return null
  }

  const url = getStringProp(eventProps?.url) ?? getStringProp(fallbackUrl)

  if (!url) {
    return null
  }

  return {
    adId,
    url,
    source: getStringProp(eventProps?.source) ?? undefined,
    type: getStringProp(eventProps?.type) ?? undefined,
  }
}

const sendAdClickBeacon = (payload: AdClickPayload) => {
  const endpoint = "/api/ads/click"
  const body = JSON.stringify(payload)

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" })
    navigator.sendBeacon(endpoint, blob)
    return
  }

  void fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Best effort only; never block navigation.
  })
}

export const ExternalLink = ({
  href,
  target = "_blank",
  doTrack = true,
  doFollow = false,
  eventName,
  eventProps,
  onClick,
  ...props
}: ExternalLinkProps) => {
  const hostname = getUrlHostname(siteConfig.url)
  const addTracking = doTrack && !href?.includes("utm_")
  const finalHref = addTracking ? addSearchParams(href!, { utm_source: hostname }) : href
  const isExternal = isExternalUrl(finalHref)
  const isAdClickEvent = eventName === "click_ad"
  const adClickPayload = isAdClickEvent ? getAdClickPayload(eventProps, finalHref) : null

  return (
    <a
      href={finalHref!}
      target={target}
      rel={`noopener${doFollow ? "" : " nofollow"}`}
      onClick={event => {
        onClick?.(event)

        if (event.defaultPrevented) {
          return
        }

        if (eventName && (isExternal || isAdClickEvent)) {
          trackRawEvent(eventName, eventProps)
        }

        if (adClickPayload) {
          sendAdClickBeacon(adClickPayload)
        }
      }}
      {...props}
    />
  )
}
