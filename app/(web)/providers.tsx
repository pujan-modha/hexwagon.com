"use client"

import { OpenPanelComponent } from "@openpanel/nextjs"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import type { PropsWithChildren } from "react"
import { PersistentAdsProvider } from "~/components/web/ads/persistent-ads-provider"
import { PosthogPageview } from "~/components/web/posthog-pageview"
import { env } from "~/env"

if (typeof window !== "undefined") {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_API_KEY, {
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    api_host: "/api/ins",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
  })
}

type ProvidersProps = PropsWithChildren<{
  openPanelClientId: string
}>

export default function Providers({ children, openPanelClientId }: ProvidersProps) {
  return (
    <PostHogProvider client={posthog}>
      <PersistentAdsProvider>
        <OpenPanelComponent
          clientId={openPanelClientId}
          apiUrl="/api/x"
          scriptUrl="/api/x/s.js"
          trackScreenViews
          trackOutgoingLinks
        />
        <PosthogPageview />
        {children}
      </PersistentAdsProvider>
    </PostHogProvider>
  )
}
