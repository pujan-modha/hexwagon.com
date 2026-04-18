"use client"

import { useEffect } from "react"
import { trackEvent } from "~/hooks/use-analytics"

type PageViewEventProps = {
  event: "port_viewed" | "theme_viewed" | "platform_viewed" | "config_viewed"
  properties: Record<string, string>
}

const PageViewEvent = ({ event, properties }: PageViewEventProps) => {
  useEffect(() => {
    trackEvent({ event, properties } as Parameters<typeof trackEvent>[0])
  }, [])

  return null
}

export { PageViewEvent }
