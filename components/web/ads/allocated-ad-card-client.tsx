"use client"

import type { AdSlot } from "@prisma/client"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { config } from "~/config"
import type { AdOne } from "~/server/web/ads/payloads"
import { AdPreviewCard } from "./ad-preview"
import { usePersistentAdIds } from "./persistent-ads-provider"

type AllocatedAdCardClientProps = {
  initialAd: AdOne | null
  slot: Extract<AdSlot, "Listing" | "Sidebar">
  scope?: string
  context?: {
    themeId?: string
    platformId?: string
  }
  className?: string
}

const defaultAd = config.ads.defaultAd

export const AllocatedAdCardClient = ({
  initialAd,
  slot,
  scope,
  context,
  className,
}: AllocatedAdCardClientProps) => {
  const pathname = usePathname()
  const persistentAdIds = usePersistentAdIds()
  const [resolvedAd, setResolvedAd] = useState<AdOne | null>(initialAd)
  const [isReplacing, setIsReplacing] = useState(false)

  const exclusionKey = useMemo(() => persistentAdIds.slice().sort().join(","), [persistentAdIds])

  const shouldReplace = Boolean(
    initialAd?.id && persistentAdIds.length && persistentAdIds.includes(initialAd.id),
  )

  useEffect(() => {
    setResolvedAd(initialAd)
  }, [initialAd])

  useEffect(() => {
    if (!shouldReplace) {
      setIsReplacing(false)
      return
    }

    const controller = new AbortController()

    const loadReplacement = async () => {
      setIsReplacing(true)

      const params = new URLSearchParams({
        slot,
        scope: scope ?? "default",
        excludeAdIds: exclusionKey,
      })

      if (context?.themeId) {
        params.set("themeId", context.themeId)
      }

      if (context?.platformId) {
        params.set("platformId", context.platformId)
      }

      try {
        const response = await fetch(`/api/ads/slot?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as { ad: AdOne | null }
        setResolvedAd(payload.ad)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to replace duplicate ad", error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsReplacing(false)
        }
      }
    }

    void loadReplacement()

    return () => controller.abort()
  }, [context?.platformId, context?.themeId, exclusionKey, pathname, scope, shouldReplace, slot])

  if (shouldReplace && (isReplacing || resolvedAd?.id === initialAd?.id)) {
    return null
  }

  return <AdPreviewCard className={className} ad={resolvedAd ?? defaultAd} interactive />
}
